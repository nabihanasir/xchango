import mongoose, { Schema, Document } from 'mongoose';

export interface IUniversity extends Document {
  name: string;
  countryId: mongoose.Types.ObjectId;
  website: string;
  seatLimit: number;
}

const UniversitySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    website: { type: String },
    seatLimit: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUniversity>('University', UniversitySchema);
