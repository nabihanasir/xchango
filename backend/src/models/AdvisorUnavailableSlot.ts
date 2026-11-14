import mongoose, { Document, Schema } from 'mongoose';

/** A 30-minute slot (identified by its start time) that an advisor has marked as unavailable for interviews. */
export interface IAdvisorUnavailableSlot extends Document {
  advisorId: mongoose.Types.ObjectId;
  start: Date;
}

const AdvisorUnavailableSlotSchema = new Schema<IAdvisorUnavailableSlot>(
  {
    advisorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    start: { type: Date, required: true },
  },
  { timestamps: true }
);

AdvisorUnavailableSlotSchema.index({ advisorId: 1, start: 1 }, { unique: true });

export default mongoose.model<IAdvisorUnavailableSlot>('AdvisorUnavailableSlot', AdvisorUnavailableSlotSchema);
