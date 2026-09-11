import type { CourseSummary } from './equivalency';

export type ResultStatus = 'draft' | 'published';

export interface AdvisorSummary {
  _id: string;
  name: string;
  email: string;
}

export interface StudentSummary {
  _id: string;
  name: string;
  email: string;
  sapId?: string;
}

export interface StudentResult {
  _id: string;
  studentId: StudentSummary | string;
  courseRequestItemId: string;
  hostCourseId: CourseSummary;
  advisorId: AdvisorSummary | string;
  grade: string;
  marks?: number | null;
  remarks?: string;
  status: ResultStatus;
  resultFileUrl?: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GradableItem {
  courseRequestItemId: string;
  hostCourseId: CourseSummary;
  student: StudentSummary;
  result: StudentResult | null;
}

export interface ResultFormPayload {
  grade: string;
  marks?: number | null;
  remarks?: string;
  status: ResultStatus;
  file?: File | null;
}
