import { Request, Response } from 'express';
import * as catalogService from '../services/catalogService';
import { NotFoundError } from '../errors/AppError';
import { UserRole } from '../models/User';
import { sendResponse } from '../utils/response';

const isAdmin = (req: Request) => (req as any).user?.role === UserRole.ADMIN;

export const getCountries = async (req: Request, res: Response) => {
  const countries = await catalogService.listCountries({ includeAll: isAdmin(req) });
  sendResponse(res, 200, 'Countries fetched successfully', countries);
};

export const getUniversities = async (req: Request, res: Response) => {
  const universities = await catalogService.listUniversities({ includeDrafts: isAdmin(req) });
  sendResponse(res, 200, 'Universities fetched successfully', universities);
};

export const getUniversityBySlug = async (req: Request, res: Response) => {
  const university = await catalogService.getUniversityBySlug(String(req.params.slug));
  if (!university) {
    throw new NotFoundError(
      'University not found.',
      'No published university matches that address.',
      'Open the programmes page and pick a university from the list.',
      'UNIVERSITY_NOT_FOUND'
    );
  }
  sendResponse(res, 200, 'University fetched successfully', university);
};

export const getCourses = async (req: Request, res: Response) => {
  const courses = await catalogService.listCourses({
    universityId: typeof req.query.universityId === 'string' ? req.query.universityId : undefined,
    type: typeof req.query.type === 'string' ? req.query.type : undefined,
  });
  sendResponse(res, 200, 'Courses fetched successfully', courses);
};
