import { Request, Response } from 'express';
import * as catalogService from '../services/catalogService';
import { sendResponse } from '../utils/response';

export const getCountries = async (_req: Request, res: Response) => {
  const countries = await catalogService.listCountries();
  sendResponse(res, 200, 'Countries fetched successfully', countries);
};

export const getUniversities = async (_req: Request, res: Response) => {
  const universities = await catalogService.listUniversities();
  sendResponse(res, 200, 'Universities fetched successfully', universities);
};

export const getCourses = async (req: Request, res: Response) => {
  const courses = await catalogService.listCourses({
    universityId: typeof req.query.universityId === 'string' ? req.query.universityId : undefined,
    type: typeof req.query.type === 'string' ? req.query.type : undefined,
  });
  sendResponse(res, 200, 'Courses fetched successfully', courses);
};
