import type { WorkflowApplication } from '../types/application';

/** Statuses in which a student can be marked as arrived (mirrors the backend rule). */
const ARRIVAL_ALLOWED_STATUSES = [
  'SHORTLISTED',
  'COURSE_REQUEST_ENABLED',
  'DOCUMENT_PENDING',
  'COURSE_SELECTION_PENDING',
  'READY_FOR_SUBMISSION',
];

export const canMarkArrival = (application: Pick<WorkflowApplication, 'status' | 'arrival'>) =>
  !application.arrival?.arrivedAt && ARRIVAL_ALLOWED_STATUSES.includes(application.status);
