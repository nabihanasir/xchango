import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';
import Application from '../models/Application';
import StudentProfile from '../models/StudentProfile';
import ProgramOutline from '../models/ProgramOutline';
import ExamVerification from '../models/ExamVerification';
import OfferLetter from '../models/OfferLetter';
import CourseRequest from '../models/CourseRequest';
import Result from '../models/Result';
import StudentDocument from '../modules/documents/document.model';
import { AuthenticationError, ForbiddenError } from '../errors/AppError';

const readToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.split(' ')[1];
  // Plain links (<a href>, <img>) cannot send headers, so the web app appends ?token=.
  return typeof req.query.token === 'string' ? req.query.token : null;
};

/** True when the file URL is attached to a record that belongs to this student. */
const studentOwnsFile = async (studentId: string, url: string) => {
  const sid = new mongoose.Types.ObjectId(studentId);
  const [application, profile, outline, exam, request, result, doc, offerApps] = await Promise.all([
    Application.exists({ studentId: sid, 'documents.fileUrl': url }),
    StudentProfile.exists({ userId: sid, 'transcript.fileUrl': url }),
    ProgramOutline.exists({ studentId: sid, fileUrl: url }),
    ExamVerification.exists({ studentId: sid, fileUrl: url }),
    CourseRequest.exists({ studentId: sid, 'items.uploadedOutline.fileUrl': url }),
    Result.exists({ studentId: sid, resultFileUrl: url }),
    StudentDocument.exists({ studentId: sid, fileUrl: url }),
    OfferLetter.findOne({ fileUrl: url }).select('applicationId').lean(),
  ]);
  if (application || profile || outline || exam || request || result || doc) return true;
  if (offerApps) return Boolean(await Application.exists({ _id: offerApps.applicationId, studentId: sid }));
  return false;
};

/** Uploaded files are private: a valid login is required, and students may only open their own files. */
export const requireFileAccess = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = readToken(req);
    if (!token) {
      throw new AuthenticationError('Authentication required', 'Uploaded files can only be opened by signed-in users.', 'Please log in and try again.', 'FILE_AUTH_REQUIRED');
    }
    let decoded: { id: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
    } catch {
      throw new AuthenticationError('Authentication failed', 'The login token is invalid or expired.', 'Please log in again.', 'FILE_AUTH_INVALID');
    }
    const user = await User.findById(decoded.id).select('role');
    if (!user) {
      throw new AuthenticationError('Authentication failed', 'The account no longer exists.', 'Please log in again.', 'AUTH_USER_NOT_FOUND');
    }
    if (user.role === 'student') {
      const url = decodeURIComponent(req.originalUrl.split('?')[0]);
      if (!(await studentOwnsFile(String(user._id), url))) {
        throw new ForbiddenError('Access denied', 'This file does not belong to your account.', 'Open only your own files.', 'FILE_ACCESS_DENIED');
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};
