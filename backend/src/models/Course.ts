import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  name: string;
  code: string;
  university: mongoose.Types.ObjectId;
  description: string;
  credits: number;
}

const CourseSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    university: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    description: { type: String },
    credits: { type: Number, required: true },
  },
  { timestamps: true }
);

CourseSchema.index({ code: 1, university: 1 }, { unique: true });

export default mongoose.model<ICourse>('Course', CourseSchema);
