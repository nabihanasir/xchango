import fs from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import { IStudentTranscript, ITranscriptCourse, ITranscriptSemester } from '../models/StudentProfile';
import { requestLlmJson } from './aiCourseMatcherService';
import { calculateWeightedAverage, getRowsFromWorkbook, gradeMap, gradePattern, parseTranscriptFile, round } from './transcriptParser';

/** Transcripts are sent to the LLM as plain text, so very long files are cut to keep prompts a sensible size. */
export const MAX_TRANSCRIPT_CHARS = 30000;
export const MIN_TRANSCRIPT_CHARS = 30;

interface LlmCourse {
  courseName?: unknown;
  grade?: unknown;
  creditHours?: unknown;
}

interface LlmSemester {
  semester?: unknown;
  sgpa?: unknown;
  courses?: LlmCourse[];
}

interface LlmTranscript {
  cgpa?: unknown;
  semesters?: LlmSemester[];
}

const buildPrompt = (text: string) => `You extract structured data from a university academic transcript.

The transcript text below may come from a PDF or a spreadsheet, so the layout can be irregular:
columns may be merged or reordered, and semesters may be labelled "Semester 3", "Fall 2022", "Term 1" or similar.

Return a JSON object with exactly this shape:
{
  "cgpa": number or null,
  "semesters": [
    {
      "semester": number,
      "sgpa": number or null,
      "courses": [{ "courseName": string, "grade": string, "creditHours": number }]
    }
  ]
}

Rules:
- Number semesters 1, 2, 3, ... in chronological order, whatever they are called in the document.
- "grade" is the letter grade only (A+, A, A-, B+, B, B-, C+, C, C-, D+, D, F).
- Skip courses without a letter grade (withdrawn, incomplete, pass/fail, in progress, transfer credit).
- "creditHours" is the credit value of the course, not the course number.
- Use null for cgpa or sgpa when the document does not state it. Never calculate or guess them.
- Do not invent courses. If the text is not a transcript, return {"semesters": []}.

TRANSCRIPT TEXT:
${text}`;

const toNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const toCourse = (raw: LlmCourse): ITranscriptCourse | null => {
  const courseName = String(raw.courseName ?? '').replace(/\s+/g, ' ').trim();
  const grade = String(raw.grade ?? '').trim().toUpperCase();
  const creditHours = toNumber(raw.creditHours);

  if (!courseName || !gradePattern.test(grade) || creditHours === null || creditHours < 0) {
    return null;
  }

  return { courseName, grade, creditHours, gradePoints: gradeMap[grade] ?? 0 };
};

/** Turns the LLM's answer into a transcript, dropping malformed entries. Grade points are always computed here. */
export const normalizeLlmTranscript = (raw: LlmTranscript | null | undefined): IStudentTranscript | null => {
  if (!raw || !Array.isArray(raw.semesters)) {
    return null;
  }

  const semesters: ITranscriptSemester[] = raw.semesters
    .map((semester, index) => {
      const courses = (Array.isArray(semester.courses) ? semester.courses : [])
        .map(toCourse)
        .filter((course): course is ITranscriptCourse => course !== null);
      const number = toNumber(semester.semester);
      const sgpa = toNumber(semester.sgpa);

      return {
        semester: number !== null && number >= 0 ? Math.round(number) : index + 1,
        sgpa: sgpa !== null && sgpa >= 0 && sgpa <= 4.5 ? sgpa : calculateWeightedAverage(courses),
        courses,
      };
    })
    .filter((semester) => semester.courses.length > 0)
    .sort((left, right) => left.semester - right.semester);

  if (!semesters.length) {
    return null;
  }

  const allCourses = semesters.flatMap((semester) => semester.courses);
  const cgpa = toNumber(raw.cgpa);

  return {
    fileUrl: '',
    cgpa: cgpa !== null && cgpa >= 0 && cgpa <= 4.5 ? round(cgpa) : calculateWeightedAverage(allCourses),
    totalCredits: round(allCourses.reduce((sum, course) => sum + course.creditHours, 0)),
    semesters: semesters.map((semester) => ({ ...semester, sgpa: round(semester.sgpa) })),
  };
};

const readPdfText = async (filePath: string): Promise<string> => {
  const parser = new PDFParse({ data: await fs.readFile(filePath) });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
};

const readTranscriptText = async (filePath: string): Promise<string> => {
  const text =
    path.extname(filePath).toLowerCase() === '.pdf'
      ? await readPdfText(filePath)
      : getRowsFromWorkbook(filePath)
          .map((cells) => cells.join(' | '))
          .join('\n');

  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
};

/**
 * Reads the transcript with the configured LLM. Returns null when no LLM is configured, so the caller
 * can fall back to a clear message. Throws when the file has no readable text or no courses are found.
 */
export const parseTranscriptWithLlm = async (filePath: string): Promise<IStudentTranscript | null> => {
  const text = await readTranscriptText(filePath);
  if (text.length < MIN_TRANSCRIPT_CHARS) {
    throw new Error('Could not read any text from this file. If it is a scanned document, upload an Excel or CSV transcript instead.');
  }

  const raw = await requestLlmJson<LlmTranscript>(buildPrompt(text.slice(0, MAX_TRANSCRIPT_CHARS)));
  if (raw === null) {
    return null;
  }

  const transcript = normalizeLlmTranscript(raw);
  if (!transcript) {
    throw new Error('No transcript data could be parsed from the uploaded file.');
  }

  return transcript;
};

/**
 * Parses an uploaded transcript. Spreadsheets go through the fast rule-based parser first and only fall back
 * to the LLM when it finds nothing; PDFs always use the LLM.
 */
export const parseUploadedTranscript = async (filePath: string): Promise<IStudentTranscript> => {
  const isPdf = path.extname(filePath).toLowerCase() === '.pdf';

  if (!isPdf) {
    try {
      return parseTranscriptFile(filePath);
    } catch (ruleBasedError) {
      const fallback = await parseTranscriptWithLlm(filePath).catch(() => null);
      if (fallback) {
        return fallback;
      }
      throw ruleBasedError;
    }
  }

  const transcript = await parseTranscriptWithLlm(filePath);
  if (!transcript) {
    throw new Error('PDF transcripts need an AI model to be configured. Upload an Excel or CSV transcript instead, or ask an admin to enable the AI model.');
  }

  return transcript;
};
