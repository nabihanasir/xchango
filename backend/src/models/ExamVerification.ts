import mongoose, { Document, Schema } from 'mongoose';

export enum ExamVerificationStatus {
  SUBMITTED = 'submitted',
  RETURNED = 'returned',
  VERIFIED = 'verified',
}

/** The document a student brings back from the host university, one per exchange application. */
export interface IExamVerification extends Document {
  applicationId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  country: string;
  fileUrl: string;
  fileName: string;
  note?: string;
  status: ExamVerificationStatus;
  returnReason?: string;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExamVerificationSchema = new Schema<IExamVerification>(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    country: { type: String, required: true, trim: true, index: true },
    fileUrl: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    note: { type: String, default: '', trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: Object.values(ExamVerificationStatus),
      default: ExamVerificationStatus.SUBMITTED,
    },
    returnReason: { type: String, default: '', trim: true, maxlength: 1000 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IExamVerification>('ExamVerification', ExamVerificationSchema);
