import mongoose, { Schema, Document } from 'mongoose';

export enum CourseType {
  HOME = 'home',
  HOST = 'host',
}

export interface ICourse extends Document {
  name: string;
  code: string;
  credits: number;
  universityId: mongoose.Types.ObjectId;
  type: CourseType;
}

const CourseSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    credits: { type: Number, required: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    type: { type: String, enum: Object.values(CourseType), required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>('Course', CourseSchema);
