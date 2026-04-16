export type RequestStatus = 'pending' | 'under_review' | 'approved' | 'rejected';
export type ItemStatus = 'pending' | 'approved' | 'rejected';
export type AIMatchStatus = 'not_started' | 'completed' | 'failed';

export interface UniversitySummary {
  _id: string;
  name: string;
}

export interface CourseSummary {
  _id: string;
  code: string;
  name: string;
  title?: string;
  description?: string;
  outlineText?: string;
  outlineFileUrl?: string;
  creditHours: number;
  type: 'home' | 'host';
  universityId?: UniversitySummary | string | null;
  isHomeCourse?: boolean;
  createdBy?: string | { _id: string; name: string; email: string } | null;
}

export interface MatchReasoning {
  overlappingTopics: string[];
  missingTopics: string[];
  additionalTopics: string[];
  creditHourAssessment: string;
  summary: string;
}

export interface CourseMatchResult {
  _id: string;
  courseRequestId: string;
  courseRequestItemId: string;
  hostCourseId: CourseSummary;
  homeCourseId: CourseSummary;
  matchScore: number;
  reasoning: MatchReasoning;
  createdAt: string;
  updatedAt: string;
}

export interface StudentSummary {
  _id: string;
  name: string;
  email: string;
  sapId?: string;
}

export interface StudentProfileSummary {
  program: string;
  semester: string;
  registrationNumber: string;
}

export interface CourseRequestItem {
  _id: string;
  hostCourseId: CourseSummary;
  homeCourseId?: CourseSummary | null;
  status: ItemStatus;
  advisorComment?: string;
  aiMatchStatus: AIMatchStatus;
  aiMatchError?: string | null;
  decidedAt?: string | null;
  matchResult?: CourseMatchResult | null;
}

export interface CourseRequest {
  _id: string;
  studentId: StudentSummary;
  studentProfile?: StudentProfileSummary | null;
  status: RequestStatus;
  advisorComment?: string;
  submittedAt: string;
  updatedAt: string;
  courseCount: number;
  items: CourseRequestItem[];
}

export interface AdvisorDecisionPayload {
  advisorComment?: string;
  wholeRequestDecision?: 'approved' | 'rejected';
  itemDecisions?: Array<{
    itemId: string;
    status: ItemStatus;
    advisorComment?: string;
  }>;
}
