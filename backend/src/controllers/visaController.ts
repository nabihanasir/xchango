import { Response } from 'express';
import { sendResponse } from '../utils/response';
import * as visaService from '../services/visaService';

export const getStudentVisa = async (req: any, res: Response) => {
  const visa = await visaService.getStudentVisaProcess(req.user._id.toString());
  sendResponse(res, 200, 'Visa process fetched successfully', visa);
};

export const getAdminVisaOverview = async (_req: any, res: Response) => {
  const rows = await visaService.getVisaOverviewForAdmin();
  sendResponse(res, 200, 'Visa processes fetched successfully', rows);
};

export const updateVisaStatus = async (req: any, res: Response) => {
  const visa = await visaService.updateVisaStatus(req.user._id.toString(), req.params.studentId, {
    status: req.body.status,
    remarks: req.body.remarks,
  });
  sendResponse(res, 200, 'Visa status updated successfully', visa);
};
