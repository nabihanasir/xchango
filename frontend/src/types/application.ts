export type ApplicationCountry = 'Malaysia' | 'South Korea' | 'Turkey';
export type AccommodationPreference = 'UNIVERSITY' | 'SELF';

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING'
  | 'ASSIGNED'
  | 'PENDING_INTERVIEW'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'COURSE_REQUEST_ENABLED'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'DOCUMENT_PENDING'
  | 'COURSE_SELECTION_PENDING'
  | 'READY_FOR_SUBMISSION';

export type SelectedCourseStatus = 'pending' | 'approved' | 'rejected';

export interface ApplicationUserSummary {
  _id: string;
  name: string;
  email: string;
  sapId?: string;
  phone?: string;
  role?: string;
}

export interface ApplicationUniversitySummary {
  _id: string;
  name: string;
}

export interface ApplicationCourseSummary {
  _id: string;
  code: string;
  name: string;
  description?: string;
  outlineText?: string;
  creditHours: number;
  type: 'home' | 'host';
  universityId?: ApplicationUniversitySummary | string;
}

export interface WorkflowApplicationDocument {
  _id?: string;
  type: string;
  fileUrl: string;
}

export interface WorkflowApplicationCourse {
  _id?: string;
  course: string | ApplicationCourseSummary | null;
  status: SelectedCourseStatus;
  advisorComment: string;
}

export interface WorkflowApplicationAIRecommendation {
  _id?: string;
  course: string | ApplicationCourseSummary | null;
  matchScore: number;
  reason: string;
}

export interface WorkflowApplicationInterview {
  date: string;
  location: string;
  stakeholders: string[];
}

export interface WorkflowApplication {
  _id: string;
  studentId: string | ApplicationUserSummary;
  advisorId?: string | ApplicationUserSummary | null;
  country: ApplicationCountry;
  university: string;
  program: string;
  travelHistory: {
    hasTravelHistory: boolean;
    details?: string;
  };
  passportValid: boolean;
  financialEligible: boolean;
  consentExtension: boolean;
  medicalCondition: {
    hasCondition: boolean;
    details?: string;
  };
  registrationNumber: string;
  accommodationPreference: AccommodationPreference;
  status: ApplicationStatus;
  interviewDate?: string;
  interview?: WorkflowApplicationInterview;
  documents: WorkflowApplicationDocument[];
  selectedCourses: WorkflowApplicationCourse[];
  aiRecommendations: WorkflowApplicationAIRecommendation[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDraftPayload {
  country: ApplicationCountry;
  university: string;
  program: string;
  travelHistory: {
    hasTravelHistory: boolean;
    details?: string;
  };
  passportValid: boolean;
  financialEligible: boolean;
  consentExtension: boolean;
  medicalCondition: {
    hasCondition: boolean;
    details?: string;
  };
  registrationNumber: string;
  accommodationPreference: AccommodationPreference;
}

export const countryOptions: Record<ApplicationCountry, string[]> = {
  Malaysia: ['MMU', 'UTHM'],
  'South Korea': ['KDU'],
  Turkey: ['GTU'],
};

export const applicationStatusTone: Record<ApplicationStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-amber-100 text-amber-700',
  ASSIGNED: 'bg-sky-100 text-sky-700',
  PENDING_INTERVIEW: 'bg-amber-100 text-amber-700',
  INTERVIEW_SCHEDULED: 'bg-indigo-100 text-indigo-700',
  INTERVIEW_COMPLETED: 'bg-emerald-100 text-emerald-700',
  COURSE_REQUEST_ENABLED: 'bg-teal-100 text-teal-700',
  SHORTLISTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  DOCUMENT_PENDING: 'bg-orange-100 text-orange-700',
  COURSE_SELECTION_PENDING: 'bg-cyan-100 text-cyan-700',
  READY_FOR_SUBMISSION: 'bg-green-100 text-green-700',
};

export const getApplicationUserId = (
  user: string | ApplicationUserSummary | null | undefined
) => {
  if (!user) {
    return '';
  }

  return typeof user === 'string' ? user : user._id;
};

export const getApplicationUserSummary = (
  user: string | ApplicationUserSummary | null | undefined
) => {
  if (!user || typeof user === 'string') {
    return null;
  }

  return user;
};

export const getApplicationCourseId = (
  course: string | ApplicationCourseSummary | null | undefined
) => {
  if (!course) {
    return '';
  }

  return typeof course === 'string' ? course : course._id;
};

export const getApplicationCourseSummary = (
  course: string | ApplicationCourseSummary | null | undefined
) => {
  if (!course || typeof course === 'string') {
    return null;
  }

  return course;
};

export const getApplicationCourseLabel = (
  course: string | ApplicationCourseSummary | null | undefined
) => {
  if (!course) {
    return 'Unknown course';
  }

  if (typeof course === 'string') {
    return course;
  }

  return `${course.code} · ${course.name}`;
};

export const getApplicationCourseUniversity = (
  course: string | ApplicationCourseSummary | null | undefined
) => {
  const summary = getApplicationCourseSummary(course);
  if (!summary?.universityId) {
    return '';
  }

  return typeof summary.universityId === 'string'
    ? ''
    : summary.universityId.name;
};
