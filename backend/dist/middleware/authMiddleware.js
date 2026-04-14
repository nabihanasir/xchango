"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = require("../errors/AppError");
const asyncHandler_1 = require("./asyncHandler");
exports.protect = (0, asyncHandler_1.asyncHandler)(async (req, _res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = await User_1.default.findById(decoded.id).select('-password');
        if (!req.user) {
            throw new AppError_1.AuthenticationError('Authentication failed', 'The token belongs to a user account that no longer exists.', 'Please log in again with a valid account.', 'AUTH_USER_NOT_FOUND');
        }
        next();
        return;
    }
    if (!token) {
        throw new AppError_1.AuthenticationError('Authentication required', 'No bearer token was provided with the request.', 'Please log in and send a valid access token.', 'TOKEN_MISSING');
    }
});
