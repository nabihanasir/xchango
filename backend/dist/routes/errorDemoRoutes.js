"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const asyncHandler_1 = require("../middleware/asyncHandler");
const AppError_1 = require("../errors/AppError");
const router = express_1.default.Router();
router.get('/validation', (0, asyncHandler_1.asyncHandler)(async () => {
    throw new AppError_1.ValidationError('Invalid demo input', 'The example route intentionally simulates invalid request data.', 'Update the request payload so it matches the required format.', 'DEMO_VALIDATION_ERROR');
}));
router.get('/auth', (0, asyncHandler_1.asyncHandler)(async () => {
    throw new AppError_1.AuthenticationError('Demo authentication failed', 'The example route intentionally simulates an unauthenticated request.', 'Sign in with valid credentials before retrying this action.', 'DEMO_AUTH_ERROR');
}));
router.get('/database', (0, asyncHandler_1.asyncHandler)(async () => {
    throw new AppError_1.DatabaseError('Demo database failure', 'The example route intentionally simulates a persistence issue.', 'Retry the request later or inspect the database connection.', 'DEMO_DATABASE_ERROR');
}));
router.get('/missing', (0, asyncHandler_1.asyncHandler)(async () => {
    throw new AppError_1.NotFoundError('Demo resource not found', 'The example route intentionally simulates a missing record.', 'Check the identifier or create the missing resource first.', 'DEMO_NOT_FOUND');
}));
exports.default = router;
