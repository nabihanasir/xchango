import { Response } from 'express';
import Notification from '../models/Notification';
import { sendResponse } from '../utils/response';

const LIST_LIMIT = 30;

export const getMyNotifications = async (req: any, res: Response) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(LIST_LIMIT),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);
  sendResponse(res, 200, 'Notifications fetched successfully', { notifications, unreadCount });
};

export const markAsRead = async (req: any, res: Response) => {
  // Scoped to the signed-in user so nobody can touch another user's notifications.
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { isRead: true });
  sendResponse(res, 200, 'Notification marked as read', null);
};

export const markAllAsRead = async (req: any, res: Response) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  sendResponse(res, 200, 'All notifications marked as read', null);
};

export const createNotification = async (userId: string, message: string) => {
  return await Notification.create({
    userId,
    message,
  });
};
