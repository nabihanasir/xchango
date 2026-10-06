import mongoose, { Document, Schema } from 'mongoose';

export enum CourseRequestStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum CourseRequestItemStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum AIMatchStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/** The real course outline a student uploads once they are at the host university. */
export interface IUploadedOutline {
  text: string;
  fileUrl?: string;
  fileName?: string;
  uploadedAt: Date;
}

export interface ICourseRequestItem extends mongoose.Types.Subdocument {
  hostCourseId: mongoose.Types.ObjectId;
  homeCourseId?: mongoose.Types.ObjectId | null;
  status: CourseRequestItemStatus;
  advisorComment?: string;
  aiMatchStatus: AIMatchStatus;
  aiMatchError?: string | null;
  uploadedOutline?: IUploadedOutline | null;
  outlineMatchStatus: AIMatchStatus;
  outlineMatchError?: string | null;
  decidedAt?: Date | null;
}

export interface ICourseRequest extends Document {
  studentId: mongoose.Types.ObjectId;
  status: CourseRequestStatus;
  advisorComment?: string;
  items: mongoose.Types.DocumentArray<ICourseRequestItem>;
  submittedAt: Date;
  updatedAt: Date;
}

const UploadedOutlineSchema = new Schema<IUploadedOutline>(
  {
    text: { type: String, required: true },
    fileUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false }
);

const CourseRequestItemSchema = new Schema<ICourseRequestItem>(
  {
    hostCourseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    homeCourseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    status: {
      type: String,
      enum: Object.values(CourseRequestItemStatus),
      default: CourseRequestItemStatus.PENDING,
    },
    advisorComment: { type: String, default: '' },
    aiMatchStatus: {
      type: String,
      enum: Object.values(AIMatchStatus),
      default: AIMatchStatus.NOT_STARTED,
    },
    aiMatchError: { type: String, default: null },
    uploadedOutline: { type: UploadedOutlineSchema, default: null },
    outlineMatchStatus: {
      type: String,
      enum: Object.values(AIMatchStatus),
      default: AIMatchStatus.NOT_STARTED,
    },
    outlineMatchError: { type: String, default: null },
    decidedAt: { type: Date, default: null },
  },
  { _id: true }
);

const CourseRequestSchema = new Schema<ICourseRequest>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(CourseRequestStatus),
      default: CourseRequestStatus.PENDING,
    },
    advisorComment: { type: String, default: '' },
    items: {
      type: [CourseRequestItemSchema],
      validate: {
        validator: (items: ICourseRequestItem[]) => items.length > 0,
        message: 'At least one host course must be selected.',
      },
    },
  },
  {
    timestamps: {
      createdAt: 'submittedAt',
      updatedAt: 'updatedAt',
    },
  }
);

export default mongoose.model<ICourseRequest>('CourseRequest', CourseRequestSchema);
