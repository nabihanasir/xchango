"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseError = exports.NotFoundError = exports.ForbiddenError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor({ code, message, reason, solution, status }) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.reason = reason;
        this.solution = solution;
        this.status = status;
        this.isOperational = true;
        Error.captureStackTrace?.(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, reason, solution, code = 'VALIDATION_ERROR') {
        super({ code, message, reason, solution, status: 400 });
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message, reason, solution, code = 'AUTHENTICATION_ERROR') {
        super({ code, message, reason, solution, status: 401 });
    }
}
exports.AuthenticationError = AuthenticationError;
class ForbiddenError extends AppError {
    constructor(message, reason, solution, code = 'FORBIDDEN') {
        super({ code, message, reason, solution, status: 403 });
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message, reason, solution, code = 'NOT_FOUND') {
        super({ code, message, reason, solution, status: 404 });
    }
}
exports.NotFoundError = NotFoundError;
class DatabaseError extends AppError {
    constructor(message, reason, solution, code = 'DATABASE_ERROR') {
        super({ code, message, reason, solution, status: 500 });
    }
}
exports.DatabaseError = DatabaseError;
