import { NextFunction, Response } from 'express';
import { ValidationError } from '../errors/AppError';
import * as applicationService from '../services/applicationService';
import * as studentService from '../services/studentService';

export const requireCompleteStudentProfile = async (
  req: any,
  _res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user?._id?.toString();
    const profile = await studentService.getStudentProfile(studentId);

    if (!profile.isProfileComplete) {
      const missing = profile.profileCompletionIssues.length
        ? profile.profileCompletionIssues.join(' and ')
        : 'required profile fields';

      throw new ValidationError(
        `Profile incomplete. Missing ${missing}.`,
        'The student profile must be completed before creating an application.',
        'Complete the profile and upload the required academic records first.',
        'PROFILE_INCOMPLETE'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireInterviewCompleted = async (
  req: any,
  _res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user?._id?.toString();
    const canRequest = await applicationService.studentCanRequestCourseApproval(studentId);

    if (!canRequest) {
      throw new ValidationError(
        'Interview not completed yet.',
        'You must complete your advisor interview before requesting course approval.',
        'Wait until your advisor marks the interview completed, then try again.',
        'INTERVIEW_NOT_COMPLETED'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
