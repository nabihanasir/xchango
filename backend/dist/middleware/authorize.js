"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = void 0;
const AppError_1 = require("../errors/AppError");
const authorizeRoles = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new AppError_1.AuthenticationError('Authentication required.', 'No authenticated user was attached to the request.', 'Sign in and try again.', 'AUTH_REQUIRED'));
        }
        if (!roles.includes(req.user.role)) {
            return next(new AppError_1.ForbiddenError('Access denied.', `User role ${req.user.role} is not authorized to access this route.`, 'Use an account with the required role and try again.', 'ROLE_NOT_ALLOWED'));
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
