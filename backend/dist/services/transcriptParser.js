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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTranscriptFile = void 0;
const XLSX = __importStar(require("xlsx"));
const gradeMap = {
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
const round = (value) => Number(value.toFixed(2));
const normalizeCell = (value) => String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const extractNumber = (value) => {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
};
const isIgnoredRow = (cells) => {
    if (!cells.length) {
        return true;
    }
    const joined = cells.join(' ').trim();
    if (!joined) {
        return true;
    }
    return ignoredRowPatterns.some((pattern) => pattern.test(joined));
};
const extractSemesterNumber = (rowText) => {
    const match = rowText.match(/semester\s*(\d+)/i);
    return match ? Number(match[1]) : null;
};
const calculateWeightedAverage = (courses) => {
    const totalCredits = courses.reduce((sum, course) => sum + course.creditHours, 0);
    if (!totalCredits) {
        return 0;
    }
    const weightedPoints = courses.reduce((sum, course) => sum + (course.creditHours * course.gradePoints), 0);
    return round(weightedPoints / totalCredits);
};
const extractCourse = (cells) => {
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
const getRowsFromWorkbook = (filePath) => {
    const workbook = XLSX.readFile(filePath, { raw: false });
    return workbook.SheetNames.flatMap((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            raw: false,
            defval: '',
            blankrows: false,
        });
        return rows.map((row) => row.map((cell) => normalizeCell(cell)).filter(Boolean));
    });
};
const parseTranscriptFile = (filePath) => {
    const rows = getRowsFromWorkbook(filePath);
    const semesters = new Map();
    let currentSemester = null;
    let detectedCgpa = null;
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
exports.parseTranscriptFile = parseTranscriptFile;
