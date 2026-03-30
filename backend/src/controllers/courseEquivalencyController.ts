import { Response } from 'express';
import { sendResponse } from '../utils/response';
import { CourseRequestItemStatus } from '../models/CourseRequest';
import * as courseEquivalencyService from '../services/courseEquivalencyService';

export const getHostCourses = async (_req: any, res: Response) => {
  const courses = await courseEquivalencyService.listHostCourses();
  sendResponse(res, 200, 'Host courses fetched successfully', courses);
};

export const getHomeCourses = async (_req: any, res: Response) => {
  const courses = await courseEquivalencyService.listHomeCourses();
  sendResponse(res, 200, 'Home courses fetched successfully', courses);
};

export const createStudentRequest = async (req: any, res: Response) => {
  const request = await courseEquivalencyService.createCourseRequest(
    req.user._id.toString(),
    req.body.hostCourseIds || []
  );
  sendResponse(res, 201, 'Course equivalency request submitted successfully', request);
};

export const getStudentRequests = async (req: any, res: Response) => {
  const requests = await courseEquivalencyService.getStudentRequests(req.user._id.toString());
  sendResponse(res, 200, 'Student course requests fetched successfully', requests);
};

export const getAdvisorRequests = async (_req: any, res: Response) => {
  const requests = await courseEquivalencyService.getAdvisorRequests();
  sendResponse(res, 200, 'Advisor requests fetched successfully', requests);
};

export const getAdvisorRequestById = async (req: any, res: Response) => {
  const request = await courseEquivalencyService.getAdvisorRequestById(req.params.id);
  sendResponse(res, 200, 'Advisor request fetched successfully', request);
};

export const updateHomeCourseSelection = async (req: any, res: Response) => {
  const request = await courseEquivalencyService.updatePairedHomeCourse(
    req.params.id,
    req.params.itemId,
    req.body.homeCourseId
  );
  sendResponse(res, 200, 'Paired home course updated successfully', request);
};

export const runMatch = async (req: any, res: Response) => {
  const request = await courseEquivalencyService.runCourseMatch(req.params.id, req.params.itemId);
  sendResponse(res, 200, 'AI course match completed successfully', request);
};

export const submitAdvisorDecision = async (req: any, res: Response) => {
  const wholeRequestDecision = req.body.wholeRequestDecision as CourseRequestItemStatus | undefined;
  const request = await courseEquivalencyService.submitAdvisorDecision(
    req.params.id,
    req.body.advisorComment || '',
    req.body.itemDecisions || [],
    wholeRequestDecision
  );
  sendResponse(res, 200, 'Advisor decision submitted successfully', request);
};
