import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true }
);

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
