import mongoose, { Schema, Document } from 'mongoose';

export interface IAdvisorProfile extends Document {
  userId: mongoose.Types.ObjectId;
  designation: string;
  department: string;
  assignedStudents: mongoose.Types.ObjectId[];
  experience: number;
  phone?: string;
  bio?: string;
  officeHours?: string;
}

const AdvisorProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    designation: { type: String, required: true, trim: true },
    department: { type: String, required: true },
    assignedStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    experience: { type: Number },
    phone: { type: String, trim: true, maxlength: 30 },
    bio: { type: String, trim: true, maxlength: 1000 },
    officeHours: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

export default mongoose.model<IAdvisorProfile>('AdvisorProfile', AdvisorProfileSchema);
