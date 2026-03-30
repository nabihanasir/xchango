import mongoose, { Schema, Document } from 'mongoose';

export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  OFFER_ISSUED = 'offer_issued',
}

export interface IApplication extends Document {
  studentId: mongoose.Types.ObjectId;
  selectedCountry: mongoose.Types.ObjectId;
  selectedUniversity: mongoose.Types.ObjectId;
  status: ApplicationStatus;
  intake: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    selectedCountry: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    selectedUniversity: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.DRAFT,
    },
    intake: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IApplication>('Application', ApplicationSchema);
