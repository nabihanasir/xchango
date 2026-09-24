import mongoose, { Document, Schema } from 'mongoose';

/**
 * Ordered stages of the visa journey. `REJECTED` is a terminal side-branch and
 * is not part of the happy-path order.
 */
export enum VisaStatus {
  NOT_STARTED = 'not_started',
  DOCUMENTS_REQUIRED = 'documents_required',
  DOCUMENTS_SUBMITTED = 'documents_submitted',
  APPLICATION_SUBMITTED = 'application_submitted',
  UNDER_REVIEW = 'under_review',
  APPOINTMENT_SCHEDULED = 'appointment_scheduled',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface IVisaHistoryEntry {
  status: VisaStatus;
  remarks: string;
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

export interface IVisaProcess extends Document {
  studentId: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId;
  status: VisaStatus;
  remarks: string;
  updatedBy: mongoose.Types.ObjectId;
  history: IVisaHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const VisaHistorySchema = new Schema<IVisaHistoryEntry>(
  {
    status: { type: String, enum: Object.values(VisaStatus), required: true },
    remarks: { type: String, default: '', trim: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const VisaProcessSchema = new Schema<IVisaProcess>(
  {
    // One visa record per student — the admin updates it in place.
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
    status: {
      type: String,
      enum: Object.values(VisaStatus),
      default: VisaStatus.NOT_STARTED,
    },
    remarks: { type: String, default: '', trim: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    history: { type: [VisaHistorySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IVisaProcess>('VisaProcess', VisaProcessSchema);
