import mongoose, { Schema, Document } from 'mongoose';

export interface ICountry extends Document {
  name: string;
  code: string;
  currency: string;
  visaRequirements: string;
}

const CountrySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    currency: { type: String },
    visaRequirements: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ICountry>('Country', CountrySchema);
