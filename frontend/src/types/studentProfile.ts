export interface StudentBasicInfo {
  fullName: string;
  cmsId: string;
  email: string;
  phone: string;
  department: string;
  semester: number;
}

export interface StudentPreferences {
  preferredCountries: string[];
  degreeLevel: string;
  fieldOfInterest: string;
  intake: string;
}

export interface TranscriptCourse {
  courseName: string;
  grade: string;
  creditHours: number;
  gradePoints: number;
}

export interface TranscriptSemester {
  semester: number;
  sgpa: number;
  courses: TranscriptCourse[];
}

export interface StudentTranscript {
  fileUrl: string;
  cgpa: number;
  totalCredits: number;
  semesters: TranscriptSemester[];
}

export interface StudentDocument {
  _id: string;
  type: string;
  fileUrl: string;
  status: string;
  uploadedAt: string;
}

export interface StudentProfile {
  _id: string;
  userId: string;
  registrationNumber: string;
  program: string;
  semester: string;
  cgpa: number;
  basicInfo: StudentBasicInfo;
  preferences: StudentPreferences;
  transcript: StudentTranscript;
  documents: StudentDocument[];
  createdAt: string;
  updatedAt: string;
}
