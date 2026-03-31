import { Response } from 'express';
import { UserRole } from '../models/User';
import * as studentService from '../services/studentService';
import { sendResponse } from '../utils/response';

const assertStudentAccess = (req: any, studentId: string) => {
  if (req.user.role === UserRole.STUDENT && req.user._id.toString() !== studentId) {
    throw new Error('You are not authorized to access this student profile.');
  }
};

const getRequestedStudentId = (req: any) => req.params.id || req.user._id.toString();

export const getProfile = async (req: any, res: Response) => {
  const profile = await studentService.getStudentProfile(req.user._id.toString());
  sendResponse(res, 200, 'Student profile fetched', profile);
};

export const updateProfile = async (req: any, res: Response) => {
  const profile = await studentService.updateStudentProfile(req.user._id.toString(), req.body);
  sendResponse(res, 200, 'Student profile updated', profile);
};

export const getStudentById = async (req: any, res: Response) => {
  const studentId = getRequestedStudentId(req);
  assertStudentAccess(req, studentId);
  const profile = await studentService.getStudentProfile(studentId);
  sendResponse(res, 200, 'Student profile fetched', profile);
};

export const updateStudentById = async (req: any, res: Response) => {
  const studentId = getRequestedStudentId(req);
  assertStudentAccess(req, studentId);
  const profile = await studentService.updateStudentProfile(studentId, req.body);
  sendResponse(res, 200, 'Student profile updated', profile);
};
