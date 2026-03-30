import mongoose, { Schema, Document } from 'mongoose';

export interface IAdvisorProfile extends Document {
  userId: mongoose.Types.ObjectId;
  department: string;
  assignedStudents: mongoose.Types.ObjectId[];
  experience: number;
}

const AdvisorProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    department: { type: String, required: true },
    assignedStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    experience: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model<IAdvisorProfile>('AdvisorProfile', AdvisorProfileSchema);
