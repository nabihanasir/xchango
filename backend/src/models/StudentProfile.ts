import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentProfile extends Document {
  user: mongoose.Types.ObjectId;
  studentId: string;
  major: string;
  university: string;
  cgpa: number;
  semester: number;
  phone: string;
  address: string;
  documents: mongoose.Types.ObjectId[];
  interestedUniversities: mongoose.Types.ObjectId[];
}

const StudentProfileSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: String, required: true, unique: true },
    major: { type: String, required: true },
    university: { type: String, required: true },
    cgpa: { type: Number, required: true },
    semester: { type: Number, required: true },
    phone: { type: String },
    address: { type: String },
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    interestedUniversities: [{ type: Schema.Types.ObjectId, ref: 'University' }],
  },
  { timestamps: true }
);

export default mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);
