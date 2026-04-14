import { Request, Response } from 'express';
import * as adminService from '../services/adminService';
import { sendResponse } from '../utils/response';

export const getDashboardStats = async (req: Request, res: Response) => {
  const stats = await adminService.getAllStats();
  sendResponse(res, 200, 'Dashboard stats fetched', stats);
};

export const addUniversity = async (req: Request, res: Response) => {
  const university = await adminService.createUniversity(req.body);
  sendResponse(res, 201, 'University added successfully', university);
};

export const addCourse = async (req: Request, res: Response) => {
  const course = await adminService.createCourse(req.body);
  sendResponse(res, 201, 'Course added successfully', course);
};

export const getUsers = async (req: Request, res: Response) => {
  const users = await adminService.getAllUsers();
  sendResponse(res, 200, 'Users fetched successfully', users);
};

export const getApplications = async (_req: Request, res: Response) => {
  const applications = await adminService.getAllApplications();
  sendResponse(res, 200, 'Applications fetched successfully', applications);
};

export const getPendingApplications = async (_req: Request, res: Response) => {
  const applications = await adminService.getPendingApplications();
  sendResponse(res, 200, 'Pending applications fetched successfully', applications);
};

export const createUser = async (req: Request, res: Response) => {
  const user = await adminService.createUser(req.body);
  sendResponse(res, 201, 'User created successfully', user);
};

export const uploadOfferLetter = async (req: any, res: Response) => {
  const { applicationId, offerLetterUrl } = req.body;
  const application = await adminService.updateApplicationOfferLetter(applicationId, offerLetterUrl);
  sendResponse(res, 200, 'Offer letter uploaded successfully', application);
};

export const addCourseMapping = async (req: Request, res: Response) => {
  const { homeCourseId, hostCourseId, applicationId } = req.body;
  const mapping = await adminService.createMapping(homeCourseId, hostCourseId, applicationId);
  sendResponse(res, 201, 'Course mapping added', mapping);
};

export const getCourseMappings = async (req: Request, res: Response) => {
  const mappings = await adminService.getAllMappings();
  sendResponse(res, 200, 'Course mappings fetched', mappings);
};
