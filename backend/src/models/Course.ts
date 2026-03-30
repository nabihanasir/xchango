import mongoose, { Schema, Document } from 'mongoose';

export enum CourseType {
  HOME = 'home',
  HOST = 'host',
}

export interface ICourse extends Document {
  name: string;
  code: string;
  description?: string;
  outlineText?: string;
  outlineFileUrl?: string;
  creditHours: number;
  credits?: number;
  universityId: mongoose.Types.ObjectId;
  type: CourseType;
}

const CourseSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String, default: '' },
    outlineText: { type: String, default: '' },
    outlineFileUrl: { type: String, default: '' },
    creditHours: { type: Number, required: true, alias: 'credits' },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    type: { type: String, enum: Object.values(CourseType), required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>('Course', CourseSchema);
