import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { PDFParse } from 'pdf-parse';
import Country from './models/Country';
import University from './models/University';
import Course, { CourseType } from './models/Course';

dotenv.config();

type ParsedCourse = {
  title: string;
  description: string;
  creditHours: number;
  program: string;
};

type ParsedUniversityBlock = {
  countryName: string;
  countryCode: string;
  universityName: string;
  universityShortCode: string;
  courses: ParsedCourse[];
};

const COUNTRY_CODES: Record<string, string> = {
  'South Korea': 'KR',
  Malaysia: 'MY',
  Turkey: 'TR',
};

const cleanupWhitespace = (value: string) =>
  value
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n +/g, '\n')
    .trim();

const slugify = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const parseCredits = (line: string) => {
  const match = line.match(/(\d+(?:\.\d+)?)\s*Credit Hours?/i);
  return match ? Number(match[1]) : 3;
};

const parseCourseBlocks = (sectionText: string) => {
  const lines = cleanupWhitespace(sectionText)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^-- \d+ of \d+ --$/.test(line));

  const courses: ParsedCourse[] = [];
  let currentProgram = '';
  let activeCourse: ParsedCourse | null = null;
  let readingDescription = false;

  const pushCourse = () => {
    if (!activeCourse) {
      return;
    }

    activeCourse.description = cleanupWhitespace(activeCourse.description);
    courses.push(activeCourse);
    activeCourse = null;
  };

  for (const line of lines) {
    if (line.startsWith('Program:')) {
      pushCourse();
      currentProgram = line.replace(/^Program:\s*/, '').trim();
      readingDescription = false;
      continue;
    }

    if (line.startsWith(' ')) {
      pushCourse();
      const withoutBullet = line.replace(/^\s*/, '').trim();
      const inlineDescriptionSplit = withoutBullet.split(/\s+\*\s*Description:\s*/i);
      activeCourse = {
        title: inlineDescriptionSplit[0].trim(),
        description: inlineDescriptionSplit[1]?.trim() || '',
        creditHours: 3,
        program: currentProgram,
      };
      readingDescription = Boolean(inlineDescriptionSplit[1]);
      continue;
    }

    if (!activeCourse) {
      continue;
    }

    if (/^o Description:/i.test(line)) {
      activeCourse.description = line.replace(/^o Description:\s*/i, '').trim();
      readingDescription = true;
      continue;
    }

    if (/^o Credits:/i.test(line)) {
      activeCourse.creditHours = parseCredits(line);
      readingDescription = false;
      continue;
    }

    if (/^o /i.test(line)) {
      readingDescription = false;
      continue;
    }

    if (readingDescription) {
      activeCourse.description = `${activeCourse.description} ${line}`.trim();
    }
  }

  pushCourse();
  return courses;
};

const parseCatalogText = (text: string): ParsedUniversityBlock[] => {
  const normalizedText = cleanupWhitespace(text).replace(/\n-- \d+ of \d+ --\n/g, '\n');
  const headerMatches = Array.from(
    normalizedText.matchAll(/^(?:[^\w\n]+\s*)?([A-Za-z ]+?)\s+\|\s+(.+)$/gm)
  );

  return headerMatches.map((match, index) => {
    const blockStart = match.index ?? 0;
    const blockEnd = headerMatches[index + 1]?.index ?? normalizedText.length;
    const blockText = normalizedText.slice(blockStart, blockEnd).trim();
    const headerLine = blockText.split('\n')[0];
    const [, countryNameRaw, universityNameRaw] =
      headerLine.match(/^(?:[^\w\n]+\s*)?([A-Za-z ]+?)\s+\|\s+(.+)$/) || [];

    const countryName = countryNameRaw.trim();
    const universityName = universityNameRaw.trim();
    const shortCodeMatch = universityName.match(/\(([^)]+)\)/);
    const universityShortCode = shortCodeMatch?.[1]?.trim().replace(/\s+/g, '-') || slugify(universityName);
    const sectionBody = blockText.split('\n').slice(1).join('\n');

    return {
      countryName,
      countryCode: COUNTRY_CODES[countryName] || countryName.slice(0, 2).toUpperCase(),
      universityName,
      universityShortCode,
      courses: parseCourseBlocks(sectionBody),
    };
  });
};

const upsertCatalog = async (blocks: ParsedUniversityBlock[]) => {
  let countriesUpserted = 0;
  let universitiesUpserted = 0;
  let coursesUpserted = 0;

  for (const block of blocks) {
    const country = await Country.findOneAndUpdate(
      { name: block.countryName },
      { $set: { code: block.countryCode } },
      { returnDocument: 'after', upsert: true }
    );
    countriesUpserted += 1;

    const university = await University.findOneAndUpdate(
      { name: block.universityName },
      {
        $set: {
          countryId: country._id,
          website: '',
          seatLimit: 100,
        },
      },
      { returnDocument: 'after', upsert: true }
    );
    universitiesUpserted += 1;

    for (const course of block.courses) {
      const code = `${block.universityShortCode}-${slugify(course.title)}`;
      await Course.findOneAndUpdate(
        { universityId: university._id, code, type: CourseType.HOST },
        {
          $set: {
            name: course.title,
            code,
            description: course.description,
            outlineText: `Program: ${course.program}. ${course.description}`.trim(),
            outlineFileUrl: '',
            creditHours: course.creditHours,
            universityId: university._id,
            type: CourseType.HOST,
          },
        },
        { returnDocument: 'after', upsert: true }
      );
      coursesUpserted += 1;
    }
  }

  return {
    countriesUpserted,
    universitiesUpserted,
    coursesUpserted,
  };
};

const main = async () => {
  const pdfPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(process.cwd(), '..', 'university-info.pdf');

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found at ${pdfPath}`);
  }

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/xchango');

  const parser = new PDFParse({ data: fs.readFileSync(pdfPath) });

  try {
    const parsedText = await parser.getText();
    const catalog = parseCatalogText(parsedText.text);

    if (!catalog.length) {
      throw new Error('No universities were parsed from the PDF.');
    }

    const summary = await upsertCatalog(catalog);
    console.log('University catalog import complete.');
    console.log(JSON.stringify({ pdfPath, universities: catalog, summary }, null, 2));
  } finally {
    await parser.destroy();
    await mongoose.disconnect();
  }
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
