import mongoose, { Schema, Document } from 'mongoose';

export enum CourseType {
  HOME = 'home',
  HOST = 'host',
}

export interface ICourse extends Document {
  title: string;
  name: string;
  code: string;
  description?: string;
  outlineText?: string;
  outlineFileUrl?: string;
  creditHours: number;
  credits?: number;
  universityId?: mongoose.Types.ObjectId | null;
  type: CourseType;
  isHomeCourse: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
}

const CourseSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    name: { type: String, default: '', trim: true },
    code: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    outlineText: { type: String, default: '' },
    outlineFileUrl: { type: String, default: '' },
    creditHours: { type: Number, required: true, alias: 'credits' },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', default: null },
    type: { type: String, enum: Object.values(CourseType), required: true },
    isHomeCourse: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

CourseSchema.pre('validate', function (this: any) {
  const doc = this as { title?: string; name?: string };

  if (!doc.title && doc.name) {
    doc.title = doc.name;
  }

  if (!doc.name && doc.title) {
    doc.name = doc.title;
  }

});

export default mongoose.model<ICourse>('Course', CourseSchema);
