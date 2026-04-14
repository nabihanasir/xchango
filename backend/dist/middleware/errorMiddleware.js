"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.errorHandler = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const AppError_1 = require("../errors/AppError");
const logger_1 = require("../utils/logger");
const buildError = (err) => {
    if (err instanceof AppError_1.AppError) {
        return err;
    }
    if (err instanceof mongoose_1.default.Error.ValidationError) {
        const validationMessage = Object.values(err.errors)
            .map((item) => item.message)
            .join(', ');
        return new AppError_1.ValidationError('Validation failed', validationMessage || 'One or more fields contain invalid values.', 'Please review the submitted fields and correct the highlighted values.', 'VALIDATION_ERROR');
    }
    if (err instanceof mongoose_1.default.Error.CastError) {
        return new AppError_1.ValidationError('Invalid identifier', `The value provided for "${err.path}" is not in the expected format.`, 'Please verify the identifier and try again.', 'INVALID_IDENTIFIER');
    }
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 11000) {
        const duplicateField = Object.keys(err.keyPattern || {})[0] || 'value';
        return new AppError_1.ValidationError('Duplicate value', `A record already exists with this ${duplicateField}.`, `Use a different ${duplicateField} and try again.`, 'DUPLICATE_VALUE');
    }
    if (err instanceof mongoose_1.default.Error) {
        return new AppError_1.DatabaseError('Database operation failed', 'The database could not complete the requested operation.', 'Please try again shortly. If the issue continues, contact support.');
    }
    if (err instanceof Error && err.name === 'JsonWebTokenError') {
        return new AppError_1.AuthenticationError('Authentication failed', 'The provided token is invalid or malformed.', 'Please sign in again to continue.', 'INVALID_TOKEN');
    }
    if (err instanceof Error && err.name === 'TokenExpiredError') {
        return new AppError_1.AuthenticationError('Session expired', 'Your login session is no longer valid.', 'Please sign in again to continue.', 'TOKEN_EXPIRED');
    }
    if (err instanceof Error) {
        return new AppError_1.AppError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unexpected server error',
            reason: err.message || 'An unexpected error occurred on the server.',
            solution: 'Please try again later or contact support if the problem continues.',
            status: 500,
        });
    }
    return new AppError_1.AppError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error',
        reason: 'An unknown error occurred on the server.',
        solution: 'Please try again later or contact support if the problem continues.',
        status: 500,
    });
};
const errorHandler = (err, req, res, _next) => {
    const normalizedError = buildError(err);
    const statusCode = normalizedError.status || res.statusCode || 500;
    const requestId = res.locals.requestId || req.headers['x-request-id'];
    logger_1.logger.error(normalizedError.message, {
        code: normalizedError.code,
        reason: normalizedError.reason,
        path: req.originalUrl,
        method: req.method,
        status: statusCode,
        requestId,
        stack: err instanceof Error ? err.stack : undefined,
    });
    res.status(statusCode).json({
        success: false,
        code: normalizedError.code,
        message: normalizedError.message,
        error: {
            code: normalizedError.code,
            message: normalizedError.message,
            reason: normalizedError.reason,
            solution: normalizedError.solution,
            status: statusCode,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            requestId,
        },
    });
};
exports.errorHandler = errorHandler;
const notFound = (req, _res, next) => {
    next(new AppError_1.NotFoundError('Resource not found', `No route exists for ${req.method} ${req.originalUrl}.`, 'Please verify the endpoint path or consult the API documentation.', 'ROUTE_NOT_FOUND'));
};
exports.notFound = notFound;
