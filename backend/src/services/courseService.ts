import Course from '../models/Course';
import CourseMapping from '../models/CourseMapping';
import { calculateSimilarity } from '../utils/similarity';

export const createCourseMapping = async (homeCourseId: string, targetCourseId: string) => {
  const homeCourse = await Course.findById(homeCourseId);
  const targetCourse = await Course.findById(targetCourseId);

  if (!homeCourse || !targetCourse) {
    throw new Error('Course not found');
  }

  const similarityScore = calculateSimilarity(homeCourse.name, targetCourse.name);

  return await CourseMapping.create({
    homeCourse: homeCourseId,
    targetCourse: targetCourseId,
    similarityScore,
    isApproved: false
  });
};

export const getAllMappings = async () => {
  return await CourseMapping.find().populate('homeCourse targetCourse reviewedBy');
};
