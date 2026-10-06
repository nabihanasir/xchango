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

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'unknown';
export type CheckKey = 'plan' | 'passed' | 'category' | 'credits' | 'creditCap';

export interface EligibilityCheck {
  key: CheckKey;
  label: string;
  status: CheckStatus;
  message: string;
}

/** How a home course fits the student's program plan, transcript and the host course. */
export interface CandidateEligibility {
  checks: EligibilityCheck[];
  eligible: boolean;
  multiplier: number;
}

export interface CourseMatchCandidate {
  homeCourseId: CourseSummary;
  /** The recommendation score: the content score lowered by every eligibility concern. */
  matchScore: number;
  /** How well the courses' content matches, before eligibility is counted. */
  contentScore?: number;
  eligibility?: CandidateEligibility;
  reasoning: MatchReasoning;
}

export interface MatchSnapshot {
  homeCourseId: CourseSummary;
  matchScore: number;
  contentScore?: number;
  eligibility?: CandidateEligibility;
  reasoning: MatchReasoning;
  matchedBy?: MatchSource;
  candidates?: CourseMatchCandidate[];
}

export type OutlineCategory =
  | 'computing_core'
  | 'mathematics_supporting'
  | 'general_education'
  | 'elective_supporting'
  | 'domain_core'
  | 'domain_elective'
  | 'unknown';

export interface OutlineCourse {
  name: string;
  code?: string;
  creditHours: number;
  category: OutlineCategory;
  slot?: string;
}

export interface OutlineSemester {
  semester: number;
  declaredCredits: number | null;
  courses: OutlineCourse[];
}

/** The student's semester-wise program plan, uploaded with their transcript and corrected by their advisor. */
export interface ProgramOutline {
  _id: string;
  studentId: string;
  programName: string;
  fileUrl: string;
  fileName: string;
  totalCredits: number;
  semesters: OutlineSemester[];
  warnings: string[];
  categoriesReviewed: boolean;
  reviewedAt?: string | null;
  updatedAt: string;
}

export interface PlanSummary {
  outlineAvailable: boolean;
  transcriptAvailable: boolean;
  categoriesReviewed: boolean;
  currentSemester: number | null;
  allowedCredits: number | null;
  requestedCredits: number;
  withinCap: boolean | null;
}

/** Top-level match fields are the description match; `outlineMatch` is the match from the uploaded outline. */
export interface CourseMatchResult {
  _id: string;
  courseRequestId: string;
  courseRequestItemId: string;
  hostCourseId: CourseSummary;
  homeCourseId?: CourseSummary | null;
  matchScore?: number;
  contentScore?: number;
  eligibility?: CandidateEligibility;
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
  /** Whether this course keeps the request within the semester's credit limit. */
  creditCap?: EligibilityCheck;
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
  planSummary?: PlanSummary;
  programOutline?: ProgramOutline | null;
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
