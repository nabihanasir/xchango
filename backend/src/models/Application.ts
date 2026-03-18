import mongoose, { Schema, Document } from 'mongoose';

export enum ApplicationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  OFFER_ISSUED = 'offer_issued',
}

export interface IApplication extends Document {
  student: mongoose.Types.ObjectId;
  university: mongoose.Types.ObjectId;
  advisor?: mongoose.Types.ObjectId;
  program: string;
  sapId: string;
  semester: string;
  universityEmail: string;
  travelHistory: string;
  passportStatus: string;
  financialEligibility: boolean;
  degreeExtension: boolean;
  status: ApplicationStatus;
  remarks: string;
  submissionDate: Date;
  reviewDate?: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    university: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    advisor: { type: Schema.Types.ObjectId, ref: 'User' },
    program: { type: String, required: true },
    sapId: { type: String, required: true },
    semester: { type: String, required: true },
    universityEmail: { type: String, required: true },
    travelHistory: { type: String },
    passportStatus: { type: String },
    financialEligibility: { type: Boolean, default: false },
    degreeExtension: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.PENDING,
    },
    remarks: { type: String, default: '' },
    submissionDate: { type: Date, default: Date.now },
    reviewDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IApplication>('Application', ApplicationSchema);
