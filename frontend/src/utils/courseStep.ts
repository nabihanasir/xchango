import type { CourseRequest } from '../types/equivalency';

/**
 * Where the student is in the course-selection step:
 * - open: no request yet, courses can be chosen
 * - in_review: a request is waiting on the advisor, selection is locked
 * - approved: the advisor approved it, the step is complete
 * - rejected: the last request was rejected, the student can resubmit
 */
export type CourseStepState = 'open' | 'in_review' | 'approved' | 'rejected';

export const getCourseStepState = (requests: CourseRequest[]): CourseStepState => {
  if (requests.some((request) => request.status === 'approved')) {
    return 'approved';
  }

  if (requests.some((request) => request.status === 'pending' || request.status === 'under_review')) {
    return 'in_review';
  }

  return requests.length ? 'rejected' : 'open';
};
