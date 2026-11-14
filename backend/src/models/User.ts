import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  STUDENT = 'student',
  ADVISOR = 'advisor',
  RIO = 'rio',
  ADMIN = 'admin',
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  sapId?: string;
  isActive: boolean;
  offboardedAt?: Date;
  deactivatedAt?: Date;
  deactivatedBy?: 'self' | 'admin';
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    sapId: { type: String, trim: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
    isActive: { type: Boolean, default: true },
    // Set once the student's exchange semester is over; the account stays but is read-only.
    offboardedAt: { type: Date },
    // isActive=false blocks login entirely (unlike off-boarding, which is read-only access).
    deactivatedAt: { type: Date },
    deactivatedBy: { type: String, enum: ['self', 'admin'] },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index(
  { sapId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sapId: {
        $exists: true,
        $type: 'string',
        $gt: '',
      },
    },
  }
);

export default mongoose.model<IUser>('User', UserSchema);
