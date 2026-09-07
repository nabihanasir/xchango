import mongoose, { Document, Schema } from 'mongoose';

export enum AiProvider {
  OPENROUTER = 'openrouter',
  GEMINI = 'gemini',
  GROQ = 'groq',
  OPENAI_COMPATIBLE = 'openai-compatible',
}

export interface IAiModelConfig extends Document {
  provider: AiProvider;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  isEnabled: boolean;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AiModelConfigSchema = new Schema<IAiModelConfig>(
  {
    provider: { type: String, enum: Object.values(AiProvider), required: true },
    baseUrl: { type: String, required: true, trim: true },
    apiKey: { type: String, required: true },
    modelName: { type: String, required: true, trim: true },
    isEnabled: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IAiModelConfig>('AiModelConfig', AiModelConfigSchema);
