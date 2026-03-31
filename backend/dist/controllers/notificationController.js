"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = exports.markAsRead = exports.getMyNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const response_1 = require("../utils/response");
const getMyNotifications = async (req, res) => {
    const notifications = await Notification_1.default.find({ userId: req.user._id }).sort({ createdAt: -1 });
    (0, response_1.sendResponse)(res, 200, 'Notifications fetched successfully', notifications);
};
exports.getMyNotifications = getMyNotifications;
const markAsRead = async (req, res) => {
    const { id } = req.params;
    await Notification_1.default.findByIdAndUpdate(id, { isRead: true });
    (0, response_1.sendResponse)(res, 200, 'Notification marked as read', null);
};
exports.markAsRead = markAsRead;
const createNotification = async (userId, message) => {
    return await Notification_1.default.create({
        userId,
        message,
    });
};
exports.createNotification = createNotification;
