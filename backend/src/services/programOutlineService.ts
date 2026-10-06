import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import ProgramOutline, {
  IOutlineCourse,
  IOutlineSemester,
  IProgramOutline,
  OutlineCategory,
} from '../models/ProgramOutline';
import { ValidationError } from '../errors/AppError';
import { parseOutlinePdf } from './programOutlinePdfParser';
import { toPublicFileUrl, uploadsRoot } from '../utils/upload';

/** A parsed semester total this far from the stated one is reported to the advisor. */
const CREDIT_MISMATCH_TOLERANCE = 0.01;

interface RawOutlineCourse {
  name?: unknown;
  code?: unknown;
  creditHours?: unknown;
  category?: unknown;
  slot?: unknown;
}

interface RawOutlineSemester {
  semester?: unknown;
  declaredCredits?: unknown;
  courses?: RawOutlineCourse[];
}

interface RawProgramOutline {
  programName?: unknown;
  semesters?: RawOutlineSemester[];
}

const CATEGORY_VALUES = new Set<string>(Object.values(OutlineCategory));

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  // "3+1" style theory+lab values are summed.
  const parts = String(value ?? '').match(/\d+(?:\.\d+)?/g);
  if (!parts) {
    return null;
  }

  return parts.reduce((sum, part) => sum + Number(part), 0);
};

const toText = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();

const toOutlineCourse = (raw: RawOutlineCourse): IOutlineCourse | null => {
  const name = toText(raw.name);
  const creditHours = toNumber(raw.creditHours);
  if (!name || creditHours === null || creditHours < 0) {
    return null;
  }

  const category = toText(raw.category).toLowerCase();
  return {
    name,
    code: toText(raw.code),
    creditHours,
    category: CATEGORY_VALUES.has(category) ? (category as OutlineCategory) : OutlineCategory.UNKNOWN,
    slot: toText(raw.slot),
  };
};

const sumCredits = (courses: IOutlineCourse[]) => courses.reduce((sum, course) => sum + course.creditHours, 0);

export interface ParsedProgramOutline {
  programName: string;
  semesters: IOutlineSemester[];
  totalCredits: number;
  warnings: string[];
}

/** Turns a read plan into a validated one, dropping malformed entries and noting where the totals do not add up. */
export const normalizeProgramOutline = (raw: RawProgramOutline | null | undefined): ParsedProgramOutline | null => {
  if (!raw || !Array.isArray(raw.semesters)) {
    return null;
  }

  const warnings: string[] = [];
  const semesters = raw.semesters
    .map((semester, index): IOutlineSemester => {
      const number = toNumber(semester.semester);
      const declared = toNumber(semester.declaredCredits);
      return {
        semester: number !== null && number >= 1 ? Math.round(number) : index + 1,
        declaredCredits: declared !== null && declared >= 0 ? declared : null,
        courses: (Array.isArray(semester.courses) ? semester.courses : [])
          .map(toOutlineCourse)
          .filter((course): course is IOutlineCourse => course !== null),
      };
    })
    .filter((semester) => semester.courses.length > 0)
    .sort((left, right) => left.semester - right.semester);

  if (!semesters.length) {
    return null;
  }

  semesters.forEach((semester) => {
    const parsed = sumCredits(semester.courses);
    if (semester.declaredCredits !== null && Math.abs(parsed - semester.declaredCredits) > CREDIT_MISMATCH_TOLERANCE) {
      warnings.push(
        `Semester ${semester.semester}: the plan states ${semester.declaredCredits} credit hours but the courses read add up to ${parsed}. Check the courses.`
      );
    }
  });

  const unknownCount = semesters.flatMap((semester) => semester.courses).filter(
    (course) => course.category === OutlineCategory.UNKNOWN
  ).length;
  if (unknownCount) {
    warnings.push(`${unknownCount} course(s) could not be categorised automatically. Set their category.`);
  }

  return {
    programName: toText(raw.programName),
    semesters,
    totalCredits: sumCredits(semesters.flatMap((semester) => semester.courses)),
    warnings,
  };
};

/**
 * Reads an uploaded program outline from the positions and colours of its table. No AI model is involved,
 * so the semester a course sits in and its category are exactly what the PDF shows. Throws a message the
 * student can act on.
 */
export const parseProgramOutlineFile = async (filePath: string): Promise<ParsedProgramOutline> => {
  if (path.extname(filePath).toLowerCase() !== '.pdf') {
    throw new ValidationError(
      'Only PDF program outlines can be read.',
      'Word and other formats are not supported yet.',
      'Save the outline as a PDF and upload it again.',
      'PROGRAM_OUTLINE_UNSUPPORTED_FORMAT'
    );
  }

  const layout = await parseOutlinePdf(filePath);
  const parsed = layout && normalizeProgramOutline(layout);
  if (!parsed) {
    throw new ValidationError(
      "This file doesn't look like a semester-wise program outline.",
      'No table with a "Semester 1, Semester 2, ..." header row and courses beneath it was found. Scanned PDFs cannot be read.',
      'Upload the PDF page or document that lists your program course by course, semester by semester.',
      'INVALID_PROGRAM_OUTLINE'
    );
  }

  return parsed;
};


export const getProgramOutline = (studentId: string) => ProgramOutline.findOne({ studentId });

/** Saves a student's outline. A new upload replaces the old one and sends the categories back for review. */
export const saveUploadedProgramOutline = async (
  studentId: string,
  file: Express.Multer.File,
  parsed: ParsedProgramOutline
): Promise<IProgramOutline> => {
  const previous = await ProgramOutline.findOne({ studentId });
  if (previous?.fileUrl) {
    // The previous file is no longer referenced once the new outline replaces it.
    await fs.unlink(path.join(uploadsRoot, previous.fileUrl.replace(/^\/uploads\//, ''))).catch(() => undefined);
  }

  return ProgramOutline.findOneAndUpdate(
    { studentId },
    {
      studentId,
      programName: parsed.programName,
      fileUrl: toPublicFileUrl(file.path),
      fileName: file.originalname,
      totalCredits: parsed.totalCredits,
      semesters: parsed.semesters,
      warnings: parsed.warnings,
      categoriesReviewed: false,
      reviewedBy: null,
      reviewedAt: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ) as Promise<IProgramOutline>;
};

export interface OutlineEditInput {
  semesters: Array<{
    semester: number;
    declaredCredits?: number | null;
    courses: Array<{ name: string; code?: string; creditHours: number; category: string; slot?: string }>;
  }>;
}

/** Advisor correction of a student's plan: course names, credits and above all categories. Marks it reviewed. */
export const updateProgramOutline = async (studentId: string, advisorId: string, input: OutlineEditInput) => {
  const outline = await ProgramOutline.findOne({ studentId });
  if (!outline) {
    throw new ValidationError(
      'This student has not uploaded a program outline.',
      'There is no program outline to edit.',
      'Ask the student to upload their program outline from their profile.',
      'PROGRAM_OUTLINE_NOT_FOUND'
    );
  }

  const parsed = normalizeProgramOutline({
    programName: outline.programName,
    semesters: Array.isArray(input?.semesters) ? input.semesters : [],
  });
  if (!parsed) {
    throw new ValidationError(
      'The program outline needs at least one semester with a course.',
      'The submitted plan has no valid courses.',
      'Add the courses back, or ask the student to upload the outline again.',
      'INVALID_PROGRAM_OUTLINE'
    );
  }

  outline.semesters = parsed.semesters;
  outline.totalCredits = parsed.totalCredits;
  outline.warnings = parsed.warnings.filter((warning) => !/categoris/i.test(warning));
  outline.categoriesReviewed = true;
  outline.reviewedBy = new mongoose.Types.ObjectId(advisorId);
  outline.reviewedAt = new Date();
  await outline.save();
  return outline;
};
