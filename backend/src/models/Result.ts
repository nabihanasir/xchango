import mongoose, { Document, Schema } from 'mongoose';

export enum ResultStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export interface IResult extends Document {
  studentId: mongoose.Types.ObjectId;
  courseRequestItemId: mongoose.Types.ObjectId;
  hostCourseId: mongoose.Types.ObjectId;
  advisorId: mongoose.Types.ObjectId;
  grade: string;
  marks?: number | null;
  remarks?: string;
  status: ResultStatus;
  resultFileUrl?: string;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ResultSchema = new Schema<IResult>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseRequestItemId: { type: Schema.Types.ObjectId, required: true, unique: true },
    hostCourseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    advisorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    grade: { type: String, required: true, trim: true },
    marks: { type: Number, min: 0, max: 100, default: null },
    remarks: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: Object.values(ResultStatus),
      default: ResultStatus.DRAFT,
    },
    resultFileUrl: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IResult>('Result', ResultSchema);
