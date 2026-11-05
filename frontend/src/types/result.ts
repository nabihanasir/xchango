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

export type VerificationStatus = 'submitted' | 'returned' | 'verified';

export interface ExamVerification {
  _id: string;
  studentId: StudentSummary | string;
  applicationId: { _id: string; country: string; university: string; program: string } | string;
  country: string;
  fileUrl: string;
  fileName: string;
  note?: string;
  status: VerificationStatus;
  returnReason?: string;
  reviewedBy?: AdvisorSummary | string | null;
  reviewedAt?: string | null;
  submittedAt: string;
}

export interface StudentVerificationState {
  application: { _id: string; country: string; university: string; program: string } | null;
  verification: ExamVerification | null;
}

export interface GradableItem {
  courseRequestItemId: string;
  hostCourseId: CourseSummary;
  student: StudentSummary;
  result: StudentResult | null;
  verificationStatus?: VerificationStatus | 'none';
}

export interface ResultFormPayload {
  grade: string;
  marks?: number | null;
  remarks?: string;
  status: ResultStatus;
  file?: File | null;
}
