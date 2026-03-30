import { Response } from 'express';
import Notification from '../models/Notification';
import { sendResponse } from '../utils/response';

export const getMyNotifications = async (req: any, res: Response) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
  sendResponse(res, 200, 'Notifications fetched successfully', notifications);
};

export const markAsRead = async (req: any, res: Response) => {
  const { id } = req.params;
  await Notification.findByIdAndUpdate(id, { isRead: true });
  sendResponse(res, 200, 'Notification marked as read', null);
};

export const createNotification = async (userId: string, message: string) => {
  return await Notification.create({
    userId,
    message,
  });
};
