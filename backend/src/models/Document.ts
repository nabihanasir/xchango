import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  name: string;
  type: string;
  url: string;
  owner: mongoose.Types.ObjectId;
  application?: mongoose.Types.ObjectId;
}

const DocumentSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    url: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    application: { type: Schema.Types.ObjectId, ref: 'Application' },
  },
  { timestamps: true }
);

export default mongoose.model<IDocument>('Document', DocumentSchema);
