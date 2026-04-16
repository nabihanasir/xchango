import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError } from '../errors/AppError';
import { sendResponse } from '../utils/response';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.registerUser(req.body);
  sendResponse(res, 201, 'User registered successfully', user);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.loginUser(req.body);
  sendResponse(res, 200, 'Login successful', user);
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.requestPasswordReset(req.body);
  sendResponse(res, 200, 'Password reset requested successfully', result);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const result = await authService.resetPassword(token, req.body);
  sendResponse(res, 200, 'Password reset successfully', result);
});

export const getMe = asyncHandler(async (req: any, res: Response) => {
  if (!req.user) {
    throw new NotFoundError(
      'User not found',
      'The authenticated user profile could not be loaded.',
      'Please sign in again or contact support if the issue continues.',
      'USER_NOT_FOUND',
    );
  }

  sendResponse(res, 200, 'User profile fetched', req.user);
});
