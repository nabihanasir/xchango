import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User, { IUser, UserRole } from '../models/User';
import { AuthenticationError, DatabaseError, ValidationError } from '../errors/AppError';
import { logger } from '../utils/logger';
import { offboardDueStudents } from './offboardingService';
import { isEmailConfigured, sendEmail } from './emailService';
import {
  NAME_PATTERN,
  PHONE_PATTERN,
  SAP_ID_PATTERN,
  MAX_PASSWORD_LENGTH,
  readEmail,
  readPassword,
  readString,
} from '../utils/validators';

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

export const registerUser = async (userData: any) => {
  const { email, password, name, role, phone, sapId } = userData;
  const normalizedRole = role || UserRole.STUDENT;

  if (normalizedRole !== UserRole.STUDENT) {
    throw new ValidationError(
      'Invalid role selection',
      'Self registration is only available for student accounts.',
      'Please select the student role to create your account.',
      'INVALID_ROLE_SELECTION',
    );
  }

  const cleanName = readString(name, 'Full name', {
    required: true,
    max: 100,
    pattern: NAME_PATTERN,
    patternHint: 'Full name can only contain letters, spaces, apostrophes, dots and hyphens.',
    code: 'NAME_REQUIRED',
  });
  if (cleanName.length < 2) {
    throw new ValidationError(
      'Name is too short',
      'The full name must be at least 2 characters.',
      'Please enter your full name and try again.',
      'NAME_TOO_SHORT',
    );
  }
  const cleanEmail = readEmail(email, 'Email', true, 'EMAIL_REQUIRED');
  const cleanPhone = readString(phone, 'Phone number', {
    required: true,
    max: 20,
    pattern: PHONE_PATTERN,
    patternHint: 'Phone number must be 7-15 digits and may start with +.',
    code: 'MISSING_STUDENT_REGISTRATION_FIELDS',
  });
  const phoneDigits = cleanPhone.replace(/[^0-9]/g, '').length;
  if (phoneDigits < 7 || phoneDigits > 15) {
    throw new ValidationError(
      'Phone number is invalid',
      'Phone number must contain between 7 and 15 digits.',
      'Please enter a valid phone number.',
      'PHONE_INVALID',
    );
  }
  const cleanSapId = readString(sapId, 'SAP ID', {
    required: true,
    max: 10,
    pattern: SAP_ID_PATTERN,
    patternHint: 'SAP ID must be 5-10 digits.',
    code: 'MISSING_STUDENT_REGISTRATION_FIELDS',
  });
  readPassword(password, 'Password');

  const normalizedEmail = cleanEmail;
  const normalizedSapId = cleanSapId;

  let existingUser;
  try {
    existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { sapId: normalizedSapId }],
    });
  } catch (error) {
    logger.error('Registration lookup failed', {
      code: 'USER_LOOKUP_FAILED',
      email: normalizedEmail,
      cause: error instanceof Error ? error.message : String(error),
    });

    throw new DatabaseError(
      'Unable to check existing account',
      'The system could not verify whether the email is already registered.',
      'Please try again in a moment.',
      'USER_LOOKUP_FAILED',
    );
  }

  if (existingUser?.email === normalizedEmail) {
    throw new ValidationError(
      'Account already exists',
      'A user is already registered with the provided email address.',
      'Please log in with that account or use a different email address.',
      'USER_ALREADY_EXISTS',
    );
  }

  if (existingUser) {
    throw new ValidationError(
      'SAP ID already registered',
      'Another account is already using the provided SAP ID.',
      'Please double-check your SAP ID, or contact support if you believe this is an error.',
      'SAP_ID_ALREADY_EXISTS',
    );
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  let user;
  try {
    user = await User.create({
      name: cleanName,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      phone: cleanPhone,
      sapId: normalizedSapId,
    });
  } catch (error) {
    // Surface the underlying failure so errorMiddleware can classify it (duplicate
    // keys, schema validation, cast errors). Collapsing everything into a generic
    // DatabaseError here hid the real cause and masked recoverable 400s as 500s.
    logger.error('Registration insert failed', {
      code: 'USER_CREATION_FAILED',
      email: normalizedEmail,
      cause: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id.toString(), user.role),
  };
};

export const loginUser = async (credentials: any) => {
  const { email, password } = credentials;

  const loginEmail = readEmail(email, 'Email', true, 'EMAIL_REQUIRED');

  if (!password || typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError(
      'Password is required',
      'The login request did not include a valid password.',
      'Please enter your password and try again.',
      'PASSWORD_REQUIRED',
    );
  }

  let user;
  try {
    user = await User.findOne({ email: loginEmail });
  } catch {
    throw new DatabaseError(
      'Unable to complete login',
      'The system could not retrieve the user account from the database.',
      'Please try again in a moment.',
      'LOGIN_USER_LOOKUP_FAILED',
    );
  }

  if (user && (await bcrypt.compare(password, user.password))) {
    if (user.isActive === false) {
      throw new AuthenticationError(
        'Account deactivated',
        'This account has been deactivated.',
        'Contact an administrator to have it reactivated.',
        'ACCOUNT_DEACTIVATED',
      );
    }

    if (user.role === UserRole.STUDENT && !user.offboardedAt) {
      await offboardDueStudents(user._id.toString());
      user = (await User.findById(user._id)) ?? user;
    }

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      offboarded: Boolean(user.offboardedAt),
      token: generateToken(user._id.toString(), user.role),
    };
  }

  throw new AuthenticationError(
    'Login failed',
    'The email address or password is incorrect.',
    'Please re-enter your credentials or reset your password if needed.',
    'INVALID_CREDENTIALS',
  );
};

const buildResetPasswordLink = (token: string) => {
  const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${frontendBaseUrl.replace(/\/$/, '')}/reset-password/${token}`;
};

export const requestPasswordReset = async (payload: any) => {
  const normalizedEmail = readEmail(payload?.email, 'Email', true, 'EMAIL_REQUIRED');

  let user: IUser | null;
  try {
    user = await User.findOne({ email: normalizedEmail });
  } catch {
    throw new DatabaseError(
      'Unable to start password reset',
      'The system could not look up the account for the provided email address.',
      'Please try again in a moment.',
      'PASSWORD_RESET_LOOKUP_FAILED',
    );
  }

  const genericResponse = {
    message: 'If an account exists for that email, a password reset link has been sent to it.',
  };

  if (!user) {
    return genericResponse;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedResetToken;
  user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 15);

  try {
    await user.save();
  } catch {
    throw new DatabaseError(
      'Unable to save password reset request',
      'The password reset token could not be stored for the account.',
      'Please try again in a moment.',
      'PASSWORD_RESET_SAVE_FAILED',
    );
  }

  const resetUrl = buildResetPasswordLink(resetToken);

  if (isEmailConfigured()) {
    // Sent in the background so response time does not reveal whether the account exists.
    void sendEmail({
      to: user.email,
      subject: 'Reset your Xchango password',
      text: `Hi ${user.name || 'there'},\n\nWe received a request to reset your Xchango password. The link below is valid for 15 minutes.\n\nIf you did not ask for this, you can ignore this email and your password will stay the same.`,
      action: { label: 'Reset password', url: resetUrl },
    });
    return genericResponse;
  }

  // Without email set up, expose the link outside production so the flow can still be tested.
  return {
    ...genericResponse,
    resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl,
  };
};

export const updateOwnName = async (userId: string, payload: any) => {
  const name = readString(payload?.name, 'Name', {
    required: true,
    max: 100,
    pattern: NAME_PATTERN,
    patternHint: 'Name can only contain letters, spaces, apostrophes, dots and hyphens.',
    code: 'NAME_REQUIRED',
  });

  const user = await User.findByIdAndUpdate(userId, { name }, { new: true });
  if (!user) {
    throw new AuthenticationError(
      'Account not found',
      'The signed-in account no longer exists.',
      'Please log in again.',
      'AUTH_USER_NOT_FOUND',
    );
  }

  return { _id: user._id, name: user.name, email: user.email, role: user.role };
};

export const changeOwnPassword = async (userId: string, payload: any) => {
  const currentPassword = payload?.currentPassword;
  const newPassword = payload?.newPassword;
  const confirmPassword = payload?.confirmPassword;

  if (!currentPassword || typeof currentPassword !== 'string') {
    throw new ValidationError(
      'Current password is required',
      'The request did not include your current password.',
      'Enter your current password and try again.',
      'CURRENT_PASSWORD_REQUIRED',
    );
  }

  readPassword(newPassword, 'New password');

  if (newPassword !== confirmPassword) {
    throw new ValidationError(
      'Passwords do not match',
      'The password confirmation does not match the new password.',
      'Re-enter both password fields and try again.',
      'PASSWORD_CONFIRMATION_MISMATCH',
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AuthenticationError(
      'Account not found',
      'The signed-in account no longer exists.',
      'Please log in again.',
      'AUTH_USER_NOT_FOUND',
    );
  }

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw new AuthenticationError(
      'Current password is incorrect',
      'The current password you entered does not match your account.',
      'Re-enter your current password and try again.',
      'INVALID_CURRENT_PASSWORD',
    );
  }

  if (await bcrypt.compare(newPassword, user.password)) {
    throw new ValidationError(
      'Password unchanged',
      'The new password is the same as your current password.',
      'Choose a different password.',
      'PASSWORD_UNCHANGED',
    );
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return { message: 'Your password has been changed.' };
};

export const resetPassword = async (token: string, payload: any) => {
  if (typeof token !== 'string' || !token.trim()) {
    throw new ValidationError(
      'Reset token is required',
      'The password reset request did not include a valid reset token.',
      'Open the latest reset link and try again.',
      'RESET_TOKEN_REQUIRED',
    );
  }

  const password = payload?.password;
  const confirmPassword = payload?.confirmPassword;

  readPassword(password, 'Password');

  if (password !== confirmPassword) {
    throw new ValidationError(
      'Passwords do not match',
      'The password confirmation does not match the new password.',
      'Re-enter both password fields and try again.',
      'PASSWORD_CONFIRMATION_MISMATCH',
    );
  }

  const hashedResetToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

  let user: IUser | null;
  try {
    user = await User.findOne({
      passwordResetToken: hashedResetToken,
      passwordResetExpires: { $gt: new Date() },
    });
  } catch {
    throw new DatabaseError(
      'Unable to verify reset token',
      'The system could not validate the password reset request.',
      'Please try again in a moment.',
      'PASSWORD_RESET_VERIFY_FAILED',
    );
  }

  if (!user) {
    throw new AuthenticationError(
      'Reset link is invalid',
      'The password reset token is invalid or has already expired.',
      'Request a new password reset link and use it within 15 minutes.',
      'INVALID_RESET_TOKEN',
    );
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  user.password = hashedPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  try {
    await user.save();
  } catch {
    throw new DatabaseError(
      'Unable to update password',
      'The system could not save the new password for this account.',
      'Please try again in a moment.',
      'PASSWORD_RESET_UPDATE_FAILED',
    );
  }

  return {
    message: 'Your password has been reset successfully.',
  };
};
