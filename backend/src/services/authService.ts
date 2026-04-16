import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User, { IUser, UserRole } from '../models/User';
import { AuthenticationError, DatabaseError, ValidationError } from '../errors/AppError';

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

  if (!phone?.trim() || !sapId?.trim()) {
    throw new ValidationError(
      'Missing registration details',
      'Phone number and SAP ID are required for student registration.',
      'Please provide both phone number and SAP ID, then submit the form again.',
      'MISSING_STUDENT_REGISTRATION_FIELDS',
    );
  }

  if (!name?.trim()) {
    throw new ValidationError(
      'Name is required',
      'The registration request did not include a full name.',
      'Please enter your full name and try again.',
      'NAME_REQUIRED',
    );
  }

  if (!email?.trim()) {
    throw new ValidationError(
      'Email is required',
      'The registration request did not include an email address.',
      'Please enter a valid university or personal email address.',
      'EMAIL_REQUIRED',
    );
  }

  if (!password || password.length < 8) {
    throw new ValidationError(
      'Password is too short',
      'The password must be at least 8 characters long.',
      'Please choose a stronger password with at least 8 characters.',
      'PASSWORD_TOO_SHORT',
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  let userExists;
  try {
    userExists = await User.findOne({ email: normalizedEmail });
  } catch {
    throw new DatabaseError(
      'Unable to check existing account',
      'The system could not verify whether the email is already registered.',
      'Please try again in a moment.',
      'USER_LOOKUP_FAILED',
    );
  }

  if (userExists) {
    throw new ValidationError(
      'Account already exists',
      'A user is already registered with the provided email address.',
      'Please log in with that account or use a different email address.',
      'USER_ALREADY_EXISTS',
    );
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  let user;
  try {
    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      phone: phone.trim(),
      sapId: sapId.trim(),
    });
  } catch {
    throw new DatabaseError(
      'Unable to create account',
      'The database could not save the new user record.',
      'Please try again shortly. If the issue persists, contact support.',
      'USER_CREATION_FAILED',
    );
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

  if (!email?.trim()) {
    throw new ValidationError(
      'Email is required',
      'The login request did not include an email address.',
      'Please enter your email address and try again.',
      'EMAIL_REQUIRED',
    );
  }

  if (!password) {
    throw new ValidationError(
      'Password is required',
      'The login request did not include a password.',
      'Please enter your password and try again.',
      'PASSWORD_REQUIRED',
    );
  }

  let user;
  try {
    user = await User.findOne({ email: email.trim().toLowerCase() });
  } catch {
    throw new DatabaseError(
      'Unable to complete login',
      'The system could not retrieve the user account from the database.',
      'Please try again in a moment.',
      'LOGIN_USER_LOOKUP_FAILED',
    );
  }

  if (user && (await bcrypt.compare(password, user.password))) {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
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
  const normalizedEmail = payload?.email?.trim()?.toLowerCase();

  if (!normalizedEmail) {
    throw new ValidationError(
      'Email is required',
      'The password reset request did not include an email address.',
      'Please enter your email address and try again.',
      'EMAIL_REQUIRED',
    );
  }

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
    message: 'If an account exists for that email, a password reset link has been prepared.',
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

  return {
    ...genericResponse,
    resetUrl: process.env.NODE_ENV === 'production' ? undefined : buildResetPasswordLink(resetToken),
  };
};

export const resetPassword = async (token: string, payload: any) => {
  if (!token?.trim()) {
    throw new ValidationError(
      'Reset token is required',
      'The password reset request did not include a valid reset token.',
      'Open the latest reset link and try again.',
      'RESET_TOKEN_REQUIRED',
    );
  }

  const password = payload?.password;
  const confirmPassword = payload?.confirmPassword;

  if (!password || password.length < 8) {
    throw new ValidationError(
      'Password is too short',
      'The new password must be at least 8 characters long.',
      'Please choose a stronger password with at least 8 characters.',
      'PASSWORD_TOO_SHORT',
    );
  }

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
