import { Request, Response } from 'express';
import * as adminService from '../services/adminService';
import { sendResponse } from '../utils/response';

export const getDashboardStats = async (req: Request, res: Response) => {
  const stats = await adminService.getAllStats();
  sendResponse(res, 200, 'Dashboard stats fetched', stats);
};

export const addUniversity = async (req: Request, res: Response) => {
  const university = await adminService.createUniversity(req.body);
  sendResponse(res, 201, 'University added successfully', university);
};

export const addCourse = async (req: Request, res: Response) => {
  const course = await adminService.createCourse(req.body);
  sendResponse(res, 201, 'Course added successfully', course);
};

export const getUsers = async (req: Request, res: Response) => {
  const users = await adminService.getAllUsers();
  sendResponse(res, 200, 'Users fetched successfully', users);
};
