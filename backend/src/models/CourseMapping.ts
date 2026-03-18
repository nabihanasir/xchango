import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseMapping extends Document {
  homeCourse: mongoose.Types.ObjectId;
  targetCourse: mongoose.Types.ObjectId;
  similarityScore: number;
  isApproved: boolean;
  reviewedBy?: mongoose.Types.ObjectId;
}

const CourseMappingSchema: Schema = new Schema(
  {
    homeCourse: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    targetCourse: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    similarityScore: { type: Number, min: 0, max: 1 },
    isApproved: { type: Boolean, default: false },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<ICourseMapping>('CourseMapping', CourseMappingSchema);
