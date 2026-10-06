import fs from 'fs/promises';
import { Response } from 'express';
import { AppError, ForbiddenError, ValidationError } from '../errors/AppError';
import { UserRole } from '../models/User';
import { parseUploadedTranscript } from '../services/transcriptLlmParser';
import * as studentService from '../services/studentService';
import { sendResponse } from '../utils/response';
import { toPublicFileUrl } from '../utils/upload';

const assertStudentAccess = (req: any, studentId: string) => {
  if (req.user.role === UserRole.STUDENT && req.user._id.toString() !== studentId) {
    throw new ForbiddenError(
      'You are not authorized to access this transcript.',
      'The requested transcript belongs to another student.',
      'Use the correct student account to access this transcript.',
      'TRANSCRIPT_ACCESS_DENIED'
    );
  }
};

export const uploadTranscript = async (req: any, res: Response) => {
  if (!req.file) {
    throw new ValidationError(
      'Please upload a transcript file.',
      'No transcript file was included in the request.',
      'Attach a transcript file and try again.',
      'TRANSCRIPT_FILE_REQUIRED'
    );
  }

  const studentId = req.body.studentId || req.user._id.toString();
  assertStudentAccess(req, studentId);

  let transcript;
  try {
    transcript = await parseUploadedTranscript(req.file.path);
  } catch (error) {
    // Don't keep files that could not be read as a transcript.
    await fs.unlink(req.file.path).catch(() => undefined);

    const detail = error instanceof Error ? error.message : 'The file could not be read.';
    if (error instanceof AppError) {
      throw error;
    }
    if (/^LLM |timed out|aborted|fetch failed|AI model/i.test(detail)) {
      throw new AppError({
        code: 'TRANSCRIPT_PARSER_UNAVAILABLE',
        message: 'Transcript reading is temporarily unavailable.',
        reason: detail,
        solution: 'Try again in a moment, or upload an Excel or CSV transcript.',
        status: 503,
      });
    }
    throw new ValidationError(
      "This file doesn't look like a transcript.",
      detail,
      'Upload your academic transcript (Excel, CSV or PDF) that lists courses, grades and credit hours.',
      'INVALID_TRANSCRIPT'
    );
  }
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
