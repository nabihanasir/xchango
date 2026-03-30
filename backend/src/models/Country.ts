import mongoose, { Schema, Document } from 'mongoose';

export interface ICountry extends Document {
  name: string;
  code: string;
}

const CountrySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICountry>('Country', CountrySchema);
