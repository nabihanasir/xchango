import { Response } from 'express';
import * as advisorService from '../services/advisorService';
import { sendResponse } from '../utils/response';

export const getAssignedApps = async (req: any, res: Response) => {
  const applications = await advisorService.getAssignedApplications(req.user._id);
  sendResponse(res, 200, 'Assigned applications fetched', applications);
};

export const getAssignedStudents = async (req: any, res: Response) => {
  const students = await advisorService.getAssignedStudents(req.user._id);
  sendResponse(res, 200, 'Assigned students fetched', students);
};

export const updateApplicationStatus = async (req: any, res: Response) => {
  const { status } = req.body;
  const application = await advisorService.reviewApplication(
    req.params.id as string,
    req.user._id.toString(),
    status
  );
  sendResponse(res, 200, 'Application status updated', application);
};

export const getProfile = async (req: any, res: Response) => {
  const profile = await advisorService.getAdvisorProfile(req.user._id);
  sendResponse(res, 200, 'Advisor profile fetched', profile);
};
