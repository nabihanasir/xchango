import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
