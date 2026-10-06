export type RequestStatus = 'pending' | 'under_review' | 'approved' | 'rejected';
export type ItemStatus = 'pending' | 'approved' | 'rejected';
export type AIMatchStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';
export type MatchSource = 'llm' | 'heuristic';
/** Which host course text a match used: the catalogue description (preliminary) or the uploaded outline (final). */
export type MatchBasis = 'description' | 'outline';

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

export interface CourseMatchCandidate {
  homeCourseId: CourseSummary;
  matchScore: number;
  reasoning: MatchReasoning;
}

export interface MatchSnapshot {
  homeCourseId: CourseSummary;
  matchScore: number;
  reasoning: MatchReasoning;
  matchedBy?: MatchSource;
  candidates?: CourseMatchCandidate[];
}

/** Top-level match fields are the description match; `outlineMatch` is the match from the uploaded outline. */
export interface CourseMatchResult {
  _id: string;
  courseRequestId: string;
  courseRequestItemId: string;
  hostCourseId: CourseSummary;
  homeCourseId?: CourseSummary | null;
  matchScore?: number;
  reasoning?: MatchReasoning;
  matchedBy?: MatchSource;
  candidates?: CourseMatchCandidate[];
  outlineMatch?: MatchSnapshot | null;
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

export interface UploadedOutline {
  text: string;
  fileUrl?: string;
  fileName?: string;
  uploadedAt: string;
}

export interface CourseRequestItem {
  _id: string;
  hostCourseId: CourseSummary;
  homeCourseId?: CourseSummary | null;
  status: ItemStatus;
  advisorComment?: string;
  aiMatchStatus: AIMatchStatus;
  aiMatchError?: string | null;
  uploadedOutline?: UploadedOutline | null;
  outlineMatchStatus?: AIMatchStatus;
  outlineMatchError?: string | null;
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
  /** Student view only: true once the student's arrival at the host university is recorded. */
  outlineUploadOpen?: boolean;
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
