import mongoose, { Schema, Document } from 'mongoose';

export enum MappingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface ICourseMapping extends Document {
  applicationId: mongoose.Types.ObjectId;
  homeCourseId: mongoose.Types.ObjectId;
  hostCourseId: mongoose.Types.ObjectId;
  similarityScore: number;
  status: MappingStatus;
  advisorId: mongoose.Types.ObjectId;
}

const CourseMappingSchema: Schema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    homeCourseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    hostCourseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    similarityScore: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(MappingStatus),
      default: MappingStatus.PENDING,
    },
    advisorId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<ICourseMapping>('CourseMapping', CourseMappingSchema);
