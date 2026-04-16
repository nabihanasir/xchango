import mongoose, { Document, Schema } from 'mongoose';

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export interface IStudentDocument extends Document {
  studentId: mongoose.Types.ObjectId;
  type: string;
  fileUrl: string;
  fileName: string;
  status: DocumentStatus;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StudentDocumentSchema = new Schema<IStudentDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      trim: true,
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

StudentDocumentSchema.index({ studentId: 1, uploadedAt: -1 });

export default mongoose.model<IStudentDocument>('StudentDocument', StudentDocumentSchema);
