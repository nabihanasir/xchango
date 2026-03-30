import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentProfile extends Document {
  userId: mongoose.Types.ObjectId;
  registrationNumber: string;
  program: string;
  semester: string;
  cgpa: number;
}

const StudentProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    registrationNumber: { type: String, required: true },
    program: { type: String, required: true },
    semester: { type: String, required: true },
    cgpa: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);
