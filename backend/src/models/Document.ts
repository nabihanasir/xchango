import mongoose, { Schema, Document } from 'mongoose';

export enum DocumentType {
  TRANSCRIPT = 'transcript',
  PASSPORT = 'passport',
  CV = 'cv',
  OTHER = 'other',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export interface IDocument extends Document {
  applicationId: mongoose.Types.ObjectId;
  fileUrl: string;
  documentType: DocumentType;
  verificationStatus: VerificationStatus;
}

const DocumentSchema: Schema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    fileUrl: { type: String, required: true },
    documentType: {
      type: String,
      enum: Object.values(DocumentType),
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDocument>('Document', DocumentSchema);
