"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendResponse = void 0;
const sendResponse = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        success: statusCode >= 200 && statusCode < 300,
        message,
        data,
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId,
    });
};
exports.sendResponse = sendResponse;
const sendError = (res, statusCode, message, reason, solution, code = 'REQUEST_ERROR') => {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            reason,
            solution,
            status: statusCode,
            timestamp: new Date().toISOString(),
            path: res.req?.originalUrl,
            requestId: res.locals.requestId,
        },
    });
};
exports.sendError = sendError;
