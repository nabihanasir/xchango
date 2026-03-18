import mongoose, { Schema, Document } from 'mongoose';

export interface IUniversity extends Document {
  name: string;
  country: mongoose.Types.ObjectId;
  location: string;
  description: string;
  website: string;
  logoUrl?: string;
  applicationDeadline: Date;
  totalSeats: number;
  availableSeats: number;
  requirements: string[];
}

const UniversitySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    country: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    location: { type: String, required: true },
    description: { type: String },
    website: { type: String },
    logoUrl: { type: String },
    applicationDeadline: { type: Date, required: true },
    totalSeats: { type: Number, required: true },
    availableSeats: { type: Number, required: true },
    requirements: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IUniversity>('University', UniversitySchema);
