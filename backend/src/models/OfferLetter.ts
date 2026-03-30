import mongoose, { Schema, Document } from 'mongoose';

export interface IOfferLetter extends Document {
  applicationId: mongoose.Types.ObjectId;
  fileUrl: string;
  issuedDate: Date;
  issuedBy: mongoose.Types.ObjectId;
}

const OfferLetterSchema: Schema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    fileUrl: { type: String, required: true },
    issuedDate: { type: Date, default: Date.now },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IOfferLetter>('OfferLetter', OfferLetterSchema);
