import mongoose from 'mongoose';
import type { ICourse } from '../models/Course';

export interface RecommendationStudentProfile {
  degreeLevel?: string;
  background?: string;
  gpa?: number;
  interests?: string[];
  transcriptCourses?: string[];
  targetProgram?: string;
}

interface CourseRecommendation {
  courseId: mongoose.Types.ObjectId;
  matchScore: number;
  reason: string;
}

const STOP_WORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'into',
  'your',
  'this',
  'that',
  'will',
  'have',
  'using',
  'use',
  'into',
  'course',
  'courses',
  'program',
  'study',
  'introduction',
  'advanced',
  'systems',
]);

const tokenize = (value: string) =>
  Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 2 && !STOP_WORDS.has(part))
    )
  );

const collectCourseTokens = (course: ICourse) =>
  tokenize([course.name, course.code, course.description || '', course.outlineText || ''].join(' '));

const getOverlap = (left: string[], right: string[]) => left.filter((item) => right.includes(item));

const toPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const getGpaBoost = (gpa: number, courseTokens: string[]) => {
  const isAdvancedCourse = courseTokens.some((token) =>
    ['advanced', 'analysis', 'research', 'algorithm', 'machine', 'intelligence'].includes(token)
  );

  if (gpa >= 3.7) {
    return isAdvancedCourse ? 15 : 12;
  }

  if (gpa >= 3.3) {
    return isAdvancedCourse ? 12 : 10;
  }

  if (gpa >= 3.0) {
    return isAdvancedCourse ? 9 : 8;
  }

  if (gpa >= 2.5) {
    return isAdvancedCourse ? 6 : 7;
  }

  return isAdvancedCourse ? 3 : 5;
};

const buildReason = ({
  backgroundOverlap,
  interestOverlap,
  transcriptOverlap,
  gpa,
  matchScore,
}: {
  backgroundOverlap: string[];
  interestOverlap: string[];
  transcriptOverlap: string[];
  gpa: number;
  matchScore: number;
}) => {
  const reasons: string[] = [];

  if (backgroundOverlap.length) {
    reasons.push(`Aligned with the student's academic background in ${backgroundOverlap.slice(0, 3).join(', ')}.`);
  }

  if (interestOverlap.length) {
    reasons.push(`Matches stated interests around ${interestOverlap.slice(0, 3).join(', ')}.`);
  }

  if (transcriptOverlap.length) {
    reasons.push(`Builds on transcript exposure to ${transcriptOverlap.slice(0, 3).join(', ')}.`);
  }

  if (gpa > 0) {
    reasons.push(`Current GPA of ${gpa.toFixed(2)} supports this recommendation at a ${matchScore}% fit level.`);
  }

  if (!reasons.length) {
    reasons.push('Recommended as a general-fit option based on available academic profile data.');
  }

  return reasons.slice(0, 3).join(' ');
};

export const getCourseRecommendations = (
  studentProfile: RecommendationStudentProfile,
  availableCourses: ICourse[]
): CourseRecommendation[] => {
  const backgroundTokens = tokenize(
    [
      studentProfile.degreeLevel || '',
      studentProfile.background || '',
      studentProfile.targetProgram || '',
    ].join(' ')
  );
  const interestTokens = tokenize((studentProfile.interests || []).join(' '));
  const transcriptTokens = tokenize((studentProfile.transcriptCourses || []).join(' '));
  const gpa = studentProfile.gpa || 0;

  return availableCourses
    .map((course) => {
      const courseTokens = collectCourseTokens(course);
      const backgroundOverlap = getOverlap(courseTokens, backgroundTokens);
      const interestOverlap = getOverlap(courseTokens, interestTokens);
      const transcriptOverlap = getOverlap(courseTokens, transcriptTokens);

      const backgroundScore = Math.min(40, backgroundOverlap.length * 10);
      const interestScore = Math.min(25, interestOverlap.length * 8 + (interestOverlap.length ? 5 : 0));
      const transcriptScore = Math.min(20, transcriptOverlap.length * 5 + (transcriptOverlap.length ? 5 : 0));
      const gpaScore = getGpaBoost(gpa, courseTokens);

      const matchScore = toPercent(backgroundScore + interestScore + transcriptScore + gpaScore);

      return {
        courseId: course._id as mongoose.Types.ObjectId,
        matchScore,
        reason: buildReason({
          backgroundOverlap,
          interestOverlap,
          transcriptOverlap,
          gpa,
          matchScore,
        }),
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, 5);
};
