import { Response } from 'express';
import * as courseService from '../services/courseService';
import { sendResponse } from '../utils/response';

export const getCourses = async (_req: any, res: Response) => {
  const courses = await courseService.listHomeCourses();
  sendResponse(res, 200, 'Courses fetched successfully', courses);
};

export const addCourse = async (req: any, res: Response) => {
  const course = await courseService.createHomeCourse(req.user._id.toString(), req.body);
  sendResponse(res, 201, 'Course created successfully', course);
};

export const updateCourse = async (req: any, res: Response) => {
  const course = await courseService.updateHomeCourse(req.params.id, req.body);
  sendResponse(res, 200, 'Course updated successfully', course);
};

export const deleteCourse = async (req: any, res: Response) => {
  await courseService.deleteHomeCourse(req.params.id);
  sendResponse(res, 200, 'Course deleted successfully', null);
};
