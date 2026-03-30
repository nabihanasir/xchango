import Course from '../models/Course';
import CourseMapping from '../models/CourseMapping';
import { calculateSimilarity } from '../utils/similarity';

export const createCourseMapping = async (homeCourseId: string, targetCourseId: string, applicationId: string) => {
  const homeCourse = await Course.findById(homeCourseId);
  const targetCourse = await Course.findById(targetCourseId);

  if (!homeCourse || !targetCourse) {
    throw new Error('Course not found');
  }

  const similarityScore = calculateSimilarity(homeCourse.name, targetCourse.name);

  return await CourseMapping.create({
    applicationId,
    homeCourseId,
    hostCourseId: targetCourseId,
    similarityScore,
    status: 'pending',
  });
};

export const getAllMappings = async () => {
  return await CourseMapping.find().populate('homeCourseId hostCourseId advisorId');
};
