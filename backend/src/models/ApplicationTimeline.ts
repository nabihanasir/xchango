import mongoose, { Schema, Document } from 'mongoose';

export interface IApplicationTimeline extends Document {
  applicationId: mongoose.Types.ObjectId;
  status: string;
  updatedBy: mongoose.Types.ObjectId;
  timestamp: Date;
}

const ApplicationTimelineSchema: Schema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    status: { type: String, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IApplicationTimeline>('ApplicationTimeline', ApplicationTimelineSchema);
