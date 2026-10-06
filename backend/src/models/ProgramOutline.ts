import mongoose, { Document, Schema } from 'mongoose';

/** The course groups used by the semester-wise plan of a degree program. */
export enum OutlineCategory {
  COMPUTING_CORE = 'computing_core',
  MATHEMATICS = 'mathematics_supporting',
  GENERAL_EDUCATION = 'general_education',
  ELECTIVE_SUPPORTING = 'elective_supporting',
  DOMAIN_CORE = 'domain_core',
  DOMAIN_ELECTIVE = 'domain_elective',
  UNKNOWN = 'unknown',
}

/** Categories that are filled by choosing a course, so a semester needs a free slot of that kind. */
export const ELECTIVE_CATEGORIES = [OutlineCategory.ELECTIVE_SUPPORTING, OutlineCategory.DOMAIN_ELECTIVE];

export interface IOutlineCourse {
  name: string;
  code?: string;
  creditHours: number;
  category: OutlineCategory;
  /** The plan's own label for an elective slot, e.g. "Domain Elective 2". */
  slot?: string;
}

export interface IOutlineSemester {
  semester: number;
  /** The credit total the plan states for the semester, when it states one. */
  declaredCredits: number | null;
  courses: IOutlineCourse[];
}

/**
 * The semester-wise course plan of a student's home program, uploaded by the student with their transcript.
 * Categories are read by the LLM from course names (the plan marks them by colour only), so an advisor
 * reviews and corrects them per student.
 */
export interface IProgramOutline extends Document {
  studentId: mongoose.Types.ObjectId;
  programName: string;
  fileUrl: string;
  fileName: string;
  totalCredits: number;
  semesters: IOutlineSemester[];
  warnings: string[];
  categoriesReviewed: boolean;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const OutlineCourseSchema = new Schema<IOutlineCourse>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, default: '', trim: true },
    creditHours: { type: Number, required: true, min: 0 },
    category: { type: String, enum: Object.values(OutlineCategory), default: OutlineCategory.UNKNOWN },
    slot: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const OutlineSemesterSchema = new Schema<IOutlineSemester>(
  {
    semester: { type: Number, required: true, min: 1 },
    declaredCredits: { type: Number, default: null, min: 0 },
    courses: { type: [OutlineCourseSchema], default: [] },
  },
  { _id: false }
);

const ProgramOutlineSchema = new Schema<IProgramOutline>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    programName: { type: String, default: '', trim: true },
    fileUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    totalCredits: { type: Number, default: 0, min: 0 },
    semesters: { type: [OutlineSemesterSchema], default: [] },
    warnings: { type: [String], default: [] },
    categoriesReviewed: { type: Boolean, default: false },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IProgramOutline>('ProgramOutline', ProgramOutlineSchema);
