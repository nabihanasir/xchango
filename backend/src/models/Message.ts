import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text: string;
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>('Message', MessageSchema);
