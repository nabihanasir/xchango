"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendResponse = void 0;
const sendResponse = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        success: statusCode >= 200 && statusCode < 300,
        message,
        data,
    });
};
exports.sendResponse = sendResponse;
const sendError = (res, statusCode, message) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
    });
};
exports.sendError = sendError;
