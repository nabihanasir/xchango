export type ApplicationCountry = 'Malaysia' | 'South Korea' | 'Turkey';
export type AccommodationPreference = 'UNIVERSITY' | 'SELF';

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_INTERVIEW'
  | 'INTERVIEW_SCHEDULED'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'DOCUMENT_PENDING'
  | 'COURSE_SELECTION_PENDING'
  | 'READY_FOR_SUBMISSION';

export interface WorkflowApplicationDocument {
  _id?: string;
  type: string;
  fileUrl: string;
}

export interface WorkflowApplicationCourse {
  _id?: string;
  courseName: string;
}

export interface WorkflowApplicationInterview {
  date: string;
  location: string;
  stakeholders: string[];
}

export interface WorkflowApplication {
  _id: string;
  studentId: string;
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
  interview?: WorkflowApplicationInterview;
  documents: WorkflowApplicationDocument[];
  selectedCourses: WorkflowApplicationCourse[];
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
  PENDING_INTERVIEW: 'bg-amber-100 text-amber-700',
  INTERVIEW_SCHEDULED: 'bg-indigo-100 text-indigo-700',
  SHORTLISTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  DOCUMENT_PENDING: 'bg-orange-100 text-orange-700',
  COURSE_SELECTION_PENDING: 'bg-cyan-100 text-cyan-700',
  READY_FOR_SUBMISSION: 'bg-green-100 text-green-700',
};
