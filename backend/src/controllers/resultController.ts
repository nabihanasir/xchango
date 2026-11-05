import { Response } from 'express';
import { sendResponse } from '../utils/response';
import { ResultStatus } from '../models/Result';
import { toPublicFileUrl } from '../utils/upload';
import { ValidationError } from '../errors/AppError';
import * as examVerificationService from '../services/examVerificationService';
import * as resultService from '../services/resultService';

export const getStudentResults = async (req: any, res: Response) => {
  const results = await resultService.getStudentResults(req.user._id.toString());
  sendResponse(res, 200, 'Results fetched successfully', results);
};

export const getAdvisorGradableItems = async (req: any, res: Response) => {
  const items = await resultService.getAdvisorGradableItems(req.user._id.toString());
  sendResponse(res, 200, 'Gradable courses fetched successfully', items);
};

export const upsertResult = async (req: any, res: Response) => {
  const status = req.body.status === ResultStatus.PUBLISHED ? ResultStatus.PUBLISHED : ResultStatus.DRAFT;
  const result = await resultService.upsertResult(req.user._id.toString(), req.params.courseRequestItemId, {
    grade: req.body.grade,
    marks: req.body.marks !== undefined && req.body.marks !== '' ? Number(req.body.marks) : null,
    remarks: req.body.remarks || '',
    status,
    resultFileUrl: req.file ? toPublicFileUrl(req.file.path) : undefined,
  });
  sendResponse(res, 200, 'Result saved successfully', result);
};

export const getAllResultsForAdmin = async (_req: any, res: Response) => {
  const results = await resultService.getAllResultsForAdmin();
  sendResponse(res, 200, 'Results fetched successfully', results);
};

export const getStudentVerification = async (req: any, res: Response) => {
  const data = await examVerificationService.getStudentVerification(req.user._id.toString());
  sendResponse(res, 200, 'Verification fetched successfully', data);
};

export const submitStudentVerification = async (req: any, res: Response) => {
  if (!req.file) {
    throw new ValidationError(
      'Please attach your verification document.',
      'No file was included in the request.',
      'Choose a PDF or image file and try again.',
      'EXAM_VERIFICATION_FILE_REQUIRED'
    );
  }

  const verification = await examVerificationService.submitVerification(req.user._id.toString(), {
    fileUrl: toPublicFileUrl(req.file.path),
    fileName: req.file.originalname,
    note: String(req.body.note || '').trim(),
  });
  sendResponse(res, 201, 'Verification document submitted successfully', verification);
};

export const getAdvisorVerifications = async (req: any, res: Response) => {
  const data = await examVerificationService.getAdvisorVerifications(req.user._id.toString());
  sendResponse(res, 200, 'Verification documents fetched successfully', data);
};

export const reviewVerification = async (req: any, res: Response) => {
  const action = req.body.action === 'return' ? 'return' : 'verify';
  const data = await examVerificationService.reviewVerification(req.user._id.toString(), req.params.id, {
    action,
    reason: req.body.reason,
  });
  sendResponse(res, 200, 'Verification document reviewed successfully', data);
};

export const getAllVerificationsForAdmin = async (_req: any, res: Response) => {
  const data = await examVerificationService.getAllVerificationsForAdmin();
  sendResponse(res, 200, 'Verification documents fetched successfully', data);
};
