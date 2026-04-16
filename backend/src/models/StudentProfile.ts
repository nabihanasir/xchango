import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentBasicInfo {
  fullName: string;
  cmsId: string;
  email: string;
  phone: string;
  department: string;
  semester: number;
}

export interface IStudentPreferences {
  preferredCountries: string[];
  degreeLevel: string;
  fieldOfInterest: string;
  intake: string;
}

export interface ITranscriptCourse {
  courseName: string;
  grade: string;
  creditHours: number;
  gradePoints: number;
}

export interface ITranscriptSemester {
  semester: number;
  sgpa: number;
  courses: ITranscriptCourse[];
}

export interface IStudentTranscript {
  fileUrl: string;
  cgpa: number;
  totalCredits: number;
  semesters: ITranscriptSemester[];
}

export interface IStudentProfile extends Document {
  userId: mongoose.Types.ObjectId;
  registrationNumber: string;
  program: string;
  semester: string;
  cgpa: number;
  isProfileComplete: boolean;
  profileCompletionIssues: string[];
  basicInfo: IStudentBasicInfo;
  preferences: IStudentPreferences;
  transcript: IStudentTranscript;
  createdAt: Date;
  updatedAt: Date;
}

const TranscriptCourseSchema = new Schema<ITranscriptCourse>(
  {
    courseName: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    creditHours: { type: Number, required: true, min: 0 },
    gradePoints: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const TranscriptSemesterSchema = new Schema<ITranscriptSemester>(
  {
    semester: { type: Number, required: true, min: 0 },
    sgpa: { type: Number, default: 0, min: 0 },
    courses: { type: [TranscriptCourseSchema], default: [] },
  },
  { _id: false }
);

const StudentProfileSchema: Schema<IStudentProfile> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    registrationNumber: { type: String, default: '', trim: true },
    program: { type: String, default: '', trim: true },
    semester: { type: String, default: '', trim: true },
    cgpa: { type: Number, default: 0, min: 0 },
    isProfileComplete: { type: Boolean, default: false },
    profileCompletionIssues: { type: [String], default: [] },
    basicInfo: {
      fullName: { type: String, default: '', trim: true },
      cmsId: { type: String, default: '', trim: true },
      email: { type: String, default: '', trim: true },
      phone: { type: String, default: '', trim: true },
      department: { type: String, default: '', trim: true },
      semester: { type: Number, default: 1, min: 0 },
    },
    preferences: {
      preferredCountries: { type: [String], default: [] },
      degreeLevel: { type: String, default: '', trim: true },
      fieldOfInterest: { type: String, default: '', trim: true },
      intake: { type: String, default: '', trim: true },
    },
    transcript: {
      fileUrl: { type: String, default: '', trim: true },
      cgpa: { type: Number, default: 0, min: 0 },
      totalCredits: { type: Number, default: 0, min: 0 },
      semesters: { type: [TranscriptSemesterSchema], default: [] },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);
