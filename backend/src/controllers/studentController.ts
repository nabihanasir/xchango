import { Request, Response } from 'express';
import * as studentService from '../services/studentService';
import { sendResponse } from '../utils/response';

export const getProfile = async (req: any, res: Response) => {
  const profile = await studentService.getStudentProfile(req.user._id);
  sendResponse(res, 200, 'Student profile fetched', profile);
};

export const updateProfile = async (req: any, res: Response) => {
  const profile = await studentService.updateStudentProfile(req.user._id, req.body);
  sendResponse(res, 200, 'Student profile updated', profile);
};

export const apply = async (req: any, res: Response) => {
  const application = await studentService.applyToUniversity(req.user._id, req.body);
  sendResponse(res, 201, 'Application submitted successfully', application);
};

export const getApplications = async (req: any, res: Response) => {
  const applications = await studentService.getStudentApplications(req.user._id);
  sendResponse(res, 200, 'Student applications fetched', applications);
};
