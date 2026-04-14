import { Response } from 'express';
import { ForbiddenError } from '../errors/AppError';
import { UserRole } from '../models/User';
import * as studentService from '../services/studentService';
import * as applicationService from '../services/applicationService';
import { sendResponse } from '../utils/response';

const assertStudentAccess = (req: any, studentId: string) => {
  if (req.user.role === UserRole.STUDENT && req.user._id.toString() !== studentId) {
    throw new ForbiddenError(
      'You are not authorized to access this student profile.',
      'The requested student profile belongs to a different user.',
      'Open the profile using the correct account or request administrator access.',
      'STUDENT_PROFILE_ACCESS_DENIED'
    );
  }
};

const assertStudentReadAccess = async (req: any, studentId: string) => {
  if (req.user.role === UserRole.ADMIN) {
    return;
  }

  if (req.user.role === UserRole.STUDENT) {
    assertStudentAccess(req, studentId);
    return;
  }

  if (req.user.role === UserRole.ADVISOR) {
    const canAccess = await applicationService.advisorCanAccessStudent(
      req.user._id.toString(),
      studentId
    );

    if (!canAccess) {
      throw new ForbiddenError(
        'You are not authorized to access this student profile.',
        'This student is not assigned to the current advisor.',
        'Open a student assigned to you or contact an administrator.',
        'STUDENT_PROFILE_ACCESS_DENIED'
      );
    }

    return;
  }

  throw new ForbiddenError(
    'You are not authorized to access this student profile.',
    'The current user role cannot access this student profile.',
    'Use a student, advisor, or admin account with valid access.',
    'STUDENT_PROFILE_ACCESS_DENIED'
  );
};

const assertStudentWriteAccess = (req: any, studentId: string) => {
  if (req.user.role === UserRole.ADMIN) {
    return;
  }

  assertStudentAccess(req, studentId);
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
  await assertStudentReadAccess(req, studentId);
  const profile = await studentService.getStudentProfile(studentId);
  sendResponse(res, 200, 'Student profile fetched', profile);
};

export const updateStudentById = async (req: any, res: Response) => {
  const studentId = getRequestedStudentId(req);
  assertStudentWriteAccess(req, studentId);
  const profile = await studentService.updateStudentProfile(studentId, req.body);
  sendResponse(res, 200, 'Student profile updated', profile);
};
