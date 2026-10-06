import fs from 'fs/promises';
import { Response } from 'express';
import { AppError, ForbiddenError, ValidationError } from '../errors/AppError';
import { UserRole } from '../models/User';
import { advisorCanAccessStudent } from '../services/applicationService';
import * as programOutlineService from '../services/programOutlineService';
import { sendResponse } from '../utils/response';

const assertCanView = async (req: any, studentId: string) => {
  const { role, _id } = req.user;
  if (role === UserRole.STUDENT && _id.toString() !== studentId) {
    throw new ForbiddenError(
      'You are not authorized to view this program outline.',
      'The requested program outline belongs to another student.',
      'Use the correct student account.',
      'PROGRAM_OUTLINE_ACCESS_DENIED'
    );
  }
};

export const uploadProgramOutline = async (req: any, res: Response) => {
  if (!req.file) {
    throw new ValidationError(
      'Please upload your program outline.',
      'No file was included in the request.',
      'Attach the PDF or Word file that lists your program semester by semester and try again.',
      'PROGRAM_OUTLINE_FILE_REQUIRED'
    );
  }

  const studentId = req.user._id.toString();

  try {
    const parsed = await programOutlineService.parseProgramOutlineFile(req.file.path);
    const outline = await programOutlineService.saveUploadedProgramOutline(studentId, req.file, parsed);
    sendResponse(res, 201, 'Program outline uploaded and read successfully', outline);
  } catch (error) {
    // Don't keep files that could not be read as a program outline.
    await fs.unlink(req.file.path).catch(() => undefined);

    if (error instanceof AppError) {
      throw error;
    }

    const detail = error instanceof Error ? error.message : 'The file could not be read.';
    if (/^LLM |timed out|aborted|fetch failed/i.test(detail)) {
      throw new AppError({
        code: 'PROGRAM_OUTLINE_PARSER_UNAVAILABLE',
        message: 'Reading the program outline is temporarily unavailable.',
        reason: detail,
        solution: 'Try again in a moment.',
        status: 503,
      });
    }
    throw new ValidationError(
      'This file could not be read as a program outline.',
      detail,
      'Upload the program outline as a PDF or Word (.docx) file.',
      'INVALID_PROGRAM_OUTLINE'
    );
  }
};

export const getProgramOutline = async (req: any, res: Response) => {
  const studentId = req.params.studentId || req.user._id.toString();
  await assertCanView(req, studentId);
  const outline = await programOutlineService.getProgramOutline(studentId);
  sendResponse(res, 200, 'Program outline fetched successfully', outline);
};

export const updateProgramOutline = async (req: any, res: Response) => {
  const advisorId = req.user._id.toString();
  const { studentId } = req.params;

  if (!(await advisorCanAccessStudent(advisorId, studentId))) {
    throw new ForbiddenError(
      'You are not assigned to this student.',
      'Only the advisor assigned to a student can edit their program outline.',
      'Ask an admin to assign you to this student.',
      'PROGRAM_OUTLINE_ACCESS_DENIED'
    );
  }

  const outline = await programOutlineService.updateProgramOutline(studentId, advisorId, req.body);
  sendResponse(res, 200, 'Program outline updated successfully', outline);
};
