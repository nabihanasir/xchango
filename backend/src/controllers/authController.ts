import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { sendResponse } from '../utils/response';

export const register = async (req: Request, res: Response) => {
  try {
    const user = await authService.registerUser(req.body);
    sendResponse(res, 201, 'User registered successfully', user);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const user = await authService.loginUser(req.body);
    sendResponse(res, 200, 'Login successful', user);
  } catch (error: any) {
    res.status(401);
    throw new Error(error.message);
  }
};

export const getMe = async (req: any, res: Response) => {
  sendResponse(res, 200, 'User profile fetched', req.user);
};
