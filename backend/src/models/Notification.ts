import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  message: string;
  subject?: string;
  type?: string;
  channels?: {
    inApp: boolean;
    email: boolean;
  };
  emailStatus?: 'queued' | 'sent' | 'failed' | 'not_requested';
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, default: '' },
    type: { type: String, default: 'general' },
    message: { type: String, required: true },
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },
    emailStatus: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'not_requested'],
      default: 'not_requested',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
