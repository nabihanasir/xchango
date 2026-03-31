import { Response } from 'express';
import { UserRole } from '../models/User';
import { parseTranscriptFile } from '../services/transcriptParser';
import * as studentService from '../services/studentService';
import { sendResponse } from '../utils/response';
import { toPublicFileUrl } from '../utils/upload';

const assertStudentAccess = (req: any, studentId: string) => {
  if (req.user.role === UserRole.STUDENT && req.user._id.toString() !== studentId) {
    throw new Error('You are not authorized to access this transcript.');
  }
};

export const uploadTranscript = async (req: any, res: Response) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a transcript file.');
  }

  const studentId = req.body.studentId || req.user._id.toString();
  assertStudentAccess(req, studentId);

  const transcript = parseTranscriptFile(req.file.path);
  transcript.fileUrl = toPublicFileUrl(req.file.path);

  const savedTranscript = await studentService.saveTranscript(studentId, transcript);
  sendResponse(res, 201, 'Transcript uploaded and parsed successfully', savedTranscript);
};

export const getTranscript = async (req: any, res: Response) => {
  const studentId = req.params.studentId;
  assertStudentAccess(req, studentId);
  const transcript = await studentService.getTranscript(studentId);
  sendResponse(res, 200, 'Transcript fetched successfully', transcript);
};
