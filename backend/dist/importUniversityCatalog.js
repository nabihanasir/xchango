"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const pdf_parse_1 = require("pdf-parse");
const Country_1 = __importDefault(require("./models/Country"));
const University_1 = __importDefault(require("./models/University"));
const Course_1 = __importStar(require("./models/Course"));
dotenv_1.default.config();
const COUNTRY_CODES = {
    'South Korea': 'KR',
    Malaysia: 'MY',
    Turkey: 'TR',
};
const cleanupWhitespace = (value) => value
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n +/g, '\n')
    .trim();
const slugify = (value) => value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
const parseCredits = (line) => {
    const match = line.match(/(\d+(?:\.\d+)?)\s*Credit Hours?/i);
    return match ? Number(match[1]) : 3;
};
const parseCourseBlocks = (sectionText) => {
    const lines = cleanupWhitespace(sectionText)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !/^-- \d+ of \d+ --$/.test(line));
    const courses = [];
    let currentProgram = '';
    let activeCourse = null;
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
const parseCatalogText = (text) => {
    const normalizedText = cleanupWhitespace(text).replace(/\n-- \d+ of \d+ --\n/g, '\n');
    const headerMatches = Array.from(normalizedText.matchAll(/^(?:[^\w\n]+\s*)?([A-Za-z ]+?)\s+\|\s+(.+)$/gm));
    return headerMatches.map((match, index) => {
        const blockStart = match.index ?? 0;
        const blockEnd = headerMatches[index + 1]?.index ?? normalizedText.length;
        const blockText = normalizedText.slice(blockStart, blockEnd).trim();
        const headerLine = blockText.split('\n')[0];
        const [, countryNameRaw, universityNameRaw] = headerLine.match(/^(?:[^\w\n]+\s*)?([A-Za-z ]+?)\s+\|\s+(.+)$/) || [];
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
const upsertCatalog = async (blocks) => {
    let countriesUpserted = 0;
    let universitiesUpserted = 0;
    let coursesUpserted = 0;
    for (const block of blocks) {
        const country = await Country_1.default.findOneAndUpdate({ name: block.countryName }, { $set: { code: block.countryCode } }, { returnDocument: 'after', upsert: true });
        countriesUpserted += 1;
        const university = await University_1.default.findOneAndUpdate({ name: block.universityName }, {
            $set: {
                countryId: country._id,
                website: '',
                seatLimit: 100,
            },
        }, { returnDocument: 'after', upsert: true });
        universitiesUpserted += 1;
        for (const course of block.courses) {
            const code = `${block.universityShortCode}-${slugify(course.title)}`;
            await Course_1.default.findOneAndUpdate({ universityId: university._id, code, type: Course_1.CourseType.HOST }, {
                $set: {
                    title: course.title,
                    name: course.title,
                    code,
                    description: course.description,
                    outlineText: `Program: ${course.program}. ${course.description}`.trim(),
                    outlineFileUrl: '',
                    creditHours: course.creditHours,
                    universityId: university._id,
                    type: Course_1.CourseType.HOST,
                    isHomeCourse: false,
                },
            }, { returnDocument: 'after', upsert: true });
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
        ? path_1.default.resolve(process.cwd(), process.argv[2])
        : path_1.default.resolve(process.cwd(), '..', 'university-info.pdf');
    if (!fs_1.default.existsSync(pdfPath)) {
        throw new Error(`PDF file not found at ${pdfPath}`);
    }
    await mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/xchango');
    const parser = new pdf_parse_1.PDFParse({ data: fs_1.default.readFileSync(pdfPath) });
    try {
        const parsedText = await parser.getText();
        const catalog = parseCatalogText(parsedText.text);
        if (!catalog.length) {
            throw new Error('No universities were parsed from the PDF.');
        }
        const summary = await upsertCatalog(catalog);
        console.log('University catalog import complete.');
        console.log(JSON.stringify({ pdfPath, universities: catalog, summary }, null, 2));
    }
    finally {
        await parser.destroy();
        await mongoose_1.default.disconnect();
    }
};
void main().catch((error) => {
    console.error(error);
    process.exit(1);
});
