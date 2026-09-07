import { Response } from 'express';
import { sendResponse } from '../utils/response';
import { ResultStatus } from '../models/Result';
import { toPublicFileUrl } from '../utils/upload';
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
