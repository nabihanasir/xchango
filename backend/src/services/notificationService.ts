import mongoose from 'mongoose';
import Notification from '../models/Notification';
import User from '../models/User';
import { logger } from '../utils/logger';
import { isEmailConfigured, sendEmail } from './emailService';

export interface NotifyUserInput {
  userId: mongoose.Types.ObjectId | string;
  subject: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  /** Also email the user (default true). */
  email?: boolean;
  /** Optional button in the email, e.g. a link back into the app. */
  action?: { label: string; url: string };
}

/** Absolute link into the frontend, e.g. appUrl('/dashboard'). */
export const appUrl = (path = '/') => {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

/** Readable date/time in the app's timezone (APP_TIMEZONE, default Asia/Karachi). */
export const formatDateTime = (value: Date | string) =>
  new Date(value).toLocaleString('en-GB', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Karachi',
    dateStyle: 'full',
    timeStyle: 'short',
  });

export const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString('en-GB', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Karachi',
    dateStyle: 'long',
  });

const deliverEmail = async (
  notificationId: unknown,
  { userId, subject, message, action }: NotifyUserInput
) => {
  const user = await User.findById(userId).select('email name');
  if (!user?.email) {
    return;
  }

  const sent = await sendEmail({
    to: user.email,
    subject,
    text: `Hi ${user.name || 'there'},\n\n${message}`,
    action,
  });

  if (notificationId) {
    await Notification.updateOne({ _id: notificationId }, { emailStatus: sent ? 'sent' : 'failed' });
  }
};

/**
 * Creates the in-app notification and, when requested, emails the user in the
 * background so the API response is never held up by the mail server.
 */
export const notifyUser = async (input: NotifyUserInput) => {
  const wantsEmail = input.email !== false;

  const notification = await Notification.create({
    userId: input.userId,
    subject: input.subject,
    type: input.type,
    message: input.message,
    channels: { inApp: true, email: wantsEmail },
    emailStatus: wantsEmail ? 'queued' : 'not_requested',
    metadata: input.metadata ?? {},
  });

  if (wantsEmail && isEmailConfigured()) {
    deliverEmail(notification?._id, input).catch((error) => {
      logger.error('Notification email failed', {
        type: input.type,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  return notification;
};

/** Same as notifyUser but never throws, for use after the main action already succeeded. */
export const notifyUserSafely = async (input: NotifyUserInput) => {
  try {
    return await notifyUser(input);
  } catch (error) {
    logger.error('Failed to create notification', {
      type: input.type,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};
