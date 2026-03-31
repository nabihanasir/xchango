import * as XLSX from 'xlsx';
import { IStudentTranscript, ITranscriptCourse, ITranscriptSemester } from '../models/StudentProfile';

const gradeMap: Record<string, number> = {
  'A+': 4.0,
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  'C-': 1.7,
  'D+': 1.3,
  D: 1.0,
  F: 0,
};

const gradePattern = /^[A-F][+-]?$/i;
const ignoredRowPatterns = [/take all courses/i, /password/i];

const round = (value: number) => Number(value.toFixed(2));

const normalizeCell = (value: unknown): string =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const extractNumber = (value: string): number | null => {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const isIgnoredRow = (cells: string[]) => {
  if (!cells.length) {
    return true;
  }

  const joined = cells.join(' ').trim();
  if (!joined) {
    return true;
  }

  return ignoredRowPatterns.some((pattern) => pattern.test(joined));
};

const extractSemesterNumber = (rowText: string): number | null => {
  const match = rowText.match(/semester\s*(\d+)/i);
  return match ? Number(match[1]) : null;
};

const calculateWeightedAverage = (courses: ITranscriptCourse[]) => {
  const totalCredits = courses.reduce((sum, course) => sum + course.creditHours, 0);
  if (!totalCredits) {
    return 0;
  }

  const weightedPoints = courses.reduce(
    (sum, course) => sum + (course.creditHours * course.gradePoints),
    0
  );

  return round(weightedPoints / totalCredits);
};

const extractCourse = (cells: string[]): ITranscriptCourse | null => {
  if (cells.length < 3) {
    return null;
  }

  const gradeIndex = cells.findIndex((cell) => gradePattern.test(cell.toUpperCase()));
  if (gradeIndex <= 0) {
    return null;
  }

  const creditIndex = cells.findIndex((cell, index) => index > gradeIndex && extractNumber(cell) !== null);
  if (creditIndex === -1) {
    return null;
  }

  const courseName = cells.slice(0, gradeIndex).join(' ').trim();
  const grade = cells[gradeIndex].toUpperCase();
  const creditHours = extractNumber(cells[creditIndex]);

  if (!courseName || creditHours === null) {
    return null;
  }

  return {
    courseName,
    grade,
    creditHours,
    gradePoints: gradeMap[grade] ?? 0,
  };
};

const getRowsFromWorkbook = (filePath: string): string[][] => {
  const workbook = XLSX.readFile(filePath, { raw: false });
  return workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    });

    return rows.map((row) => row.map((cell) => normalizeCell(cell)).filter(Boolean));
  });
};

export const parseTranscriptFile = (filePath: string): IStudentTranscript => {
  const rows = getRowsFromWorkbook(filePath);
  const semesters = new Map<number, ITranscriptSemester>();
  let currentSemester: ITranscriptSemester | null = null;
  let detectedCgpa: number | null = null;

  rows.forEach((cells) => {
    if (isIgnoredRow(cells)) {
      return;
    }

    const rowText = cells.join(' ');
    const semesterNumber = extractSemesterNumber(rowText);
    if (semesterNumber !== null) {
      const existingSemester = semesters.get(semesterNumber);
      currentSemester = existingSemester || {
        semester: semesterNumber,
        sgpa: 0,
        courses: [],
      };

      semesters.set(semesterNumber, currentSemester);
      return;
    }

    if (/cgpa/i.test(rowText)) {
      const numericValue = extractNumber(rowText);
      if (numericValue !== null) {
        detectedCgpa = numericValue;
      }
      return;
    }

    if (/sgpa/i.test(rowText) && currentSemester) {
      const numericValue = extractNumber(rowText);
      if (numericValue !== null) {
        currentSemester.sgpa = numericValue;
      }
      return;
    }

    const course = extractCourse(cells);
    if (course && currentSemester) {
      currentSemester.courses.push(course);
    }
  });

  const parsedSemesters = Array.from(semesters.values())
    .filter((semester) => semester.courses.length > 0)
    .sort((left, right) => left.semester - right.semester)
    .map((semester) => ({
      ...semester,
      sgpa: semester.sgpa || calculateWeightedAverage(semester.courses),
    }));

  if (!parsedSemesters.length) {
    throw new Error('No transcript data could be parsed from the uploaded file.');
  }

  const allCourses = parsedSemesters.flatMap((semester) => semester.courses);
  const totalCredits = round(allCourses.reduce((sum, course) => sum + course.creditHours, 0));
  const cgpa = detectedCgpa !== null ? round(detectedCgpa) : calculateWeightedAverage(allCourses);

  return {
    fileUrl: '',
    cgpa,
    totalCredits,
    semesters: parsedSemesters,
  };
};
