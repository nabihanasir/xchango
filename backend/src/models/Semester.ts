import mongoose, { Document, Schema } from 'mongoose';

/** An academic semester with dates set by the admin. Students whose application closes are locked out until it ends. */
export interface ISemester extends Document {
  name: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SemesterSchema = new Schema<ISemester>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISemester>('Semester', SemesterSchema);
