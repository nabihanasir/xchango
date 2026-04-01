import { Response } from 'express';
import { ApplicationStatus } from '../models/Application';
import { UserRole } from '../models/User';
import * as applicationService from '../services/applicationService';
import { sendResponse } from '../utils/response';
import { toPublicFileUrl } from '../utils/upload';

const assertStudentAccess = (req: any, studentId: string) => {
  if (req.user.role === UserRole.STUDENT && req.user._id.toString() !== studentId) {
    throw new Error('You are not authorized to access these applications.');
  }
};

export const createApplication = async (req: any, res: Response) => {
  const studentId = req.body.studentId || req.user._id.toString();
  assertStudentAccess(req, studentId);
  const application = await applicationService.createApplication(studentId, req.body);
  sendResponse(res, 201, 'Application draft created successfully', application);
};

export const updateApplicationStep = async (req: any, res: Response) => {
  const application = await applicationService.updateApplicationStep(
    req.params.id,
    req.user._id.toString(),
    req.body
  );
  sendResponse(res, 200, 'Application step updated successfully', application);
};

export const getApplication = async (req: any, res: Response) => {
  const application = await applicationService.getApplicationById(req.params.id, {
    _id: req.user._id.toString(),
    role: req.user.role,
  });
  sendResponse(res, 200, 'Application fetched successfully', application);
};

export const getStudentApplications = async (req: any, res: Response) => {
  const studentId = req.params.studentId;
  assertStudentAccess(req, studentId);
  const applications = await applicationService.getStudentApplications(studentId);
  sendResponse(res, 200, 'Applications fetched successfully', applications);
};

export const submitApplication = async (req: any, res: Response) => {
  const result = await applicationService.submitApplication(req.params.id, req.user._id.toString());
  const warningSuffix = result.warnings.length ? ` Warning: ${result.warnings.join(' ')}` : '';
  sendResponse(res, 200, `Application submitted successfully.${warningSuffix}`, result.application);
};

export const assignAdvisor = async (req: any, res: Response) => {
  const application = await applicationService.assignAdvisor(req.params.id, req.body.advisorId);
  sendResponse(res, 200, 'Advisor assigned successfully', application);
};

export const getAdvisorApplications = async (req: any, res: Response) => {
  const applications = await applicationService.getAdvisorApplications(req.user._id.toString());
  sendResponse(res, 200, 'Assigned applications fetched successfully', applications);
};

export const scheduleInterview = async (req: any, res: Response) => {
  const application = await applicationService.scheduleInterview(
    req.params.id,
    req.user._id.toString(),
    req.body
  );
  sendResponse(res, 200, 'Interview scheduled successfully', application);
};

export const updateStatus = async (req: any, res: Response) => {
  const application = await applicationService.updateStatus(
    req.params.id,
    req.user._id.toString(),
    req.body.status as ApplicationStatus
  );
  sendResponse(res, 200, 'Application status updated successfully', application);
};

export const uploadDocuments = async (req: any, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    res.status(400);
    throw new Error('Upload at least one application document.');
  }

  const documents = req.files.map((file: Express.Multer.File) => ({
    type: req.body.type || 'supporting_document',
    fileUrl: toPublicFileUrl(file.path),
  }));

  const application = await applicationService.uploadDocuments(
    req.params.id,
    req.user._id.toString(),
    documents
  );

  sendResponse(res, 200, 'Application documents uploaded successfully', application);
};

export const selectCourses = async (req: any, res: Response) => {
  const courseNames = Array.isArray(req.body.courseNames) ? req.body.courseNames : [];
  const application = await applicationService.selectCourses(
    req.params.id,
    req.user._id.toString(),
    courseNames
  );
  sendResponse(res, 200, 'Application courses selected successfully', application);
};
