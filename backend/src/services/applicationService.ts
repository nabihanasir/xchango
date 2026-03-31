import Application, {
  AccommodationPreference,
  ApplicationCountry,
  ApplicationStatus,
  IApplication,
} from '../models/Application';

export const applicationOptions: Record<ApplicationCountry, string[]> = {
  [ApplicationCountry.MALAYSIA]: ['MMU', 'UTHM'],
  [ApplicationCountry.SOUTH_KOREA]: ['KDU'],
  [ApplicationCountry.TURKEY]: ['GTU'],
};

interface ApplicationStepInput {
  country?: ApplicationCountry;
  university?: string;
  program?: string;
  travelHistory?: {
    hasTravelHistory: boolean;
    details?: string;
  };
  passportValid?: boolean;
  financialEligible?: boolean;
  consentExtension?: boolean;
  medicalCondition?: {
    hasCondition: boolean;
    details?: string;
  };
  registrationNumber?: string;
  accommodationPreference?: AccommodationPreference;
}

const ensureApplicationAccess = (application: IApplication | null, studentId: string) => {
  if (!application) {
    throw new Error('Application not found.');
  }

  if (application.studentId.toString() !== studentId) {
    throw new Error('You are not authorized to access this application.');
  }

  return application;
};

const validateUniversitySelection = (country: ApplicationCountry, university: string) => {
  const supportedUniversities = applicationOptions[country];
  if (!supportedUniversities) {
    throw new Error('Selected country is not supported.');
  }

  if (!supportedUniversities.includes(university)) {
    throw new Error('Selected university is not available for the chosen country.');
  }
};

const validateMedicalCondition = (input?: ApplicationStepInput['medicalCondition']) => {
  if (input?.hasCondition && !input.details?.trim()) {
    throw new Error('Medical condition details are required.');
  }
};

const validateTravelHistory = (input?: ApplicationStepInput['travelHistory']) => {
  if (input?.hasTravelHistory && !input.details?.trim()) {
    throw new Error('Travel history details are required.');
  }
};

const calculatePostShortlistStatus = (application: IApplication) => {
  const hasDocuments = application.documents.length > 0;
  const hasSelectedCourses = application.selectedCourses.length > 0;

  if (hasDocuments && hasSelectedCourses) {
    return ApplicationStatus.READY_FOR_SUBMISSION;
  }

  if (hasDocuments) {
    return ApplicationStatus.DOCUMENT_PENDING;
  }

  if (hasSelectedCourses) {
    return ApplicationStatus.COURSE_SELECTION_PENDING;
  }

  return ApplicationStatus.SHORTLISTED;
};

const applyStepInput = (application: IApplication, input: ApplicationStepInput) => {
  if (input.country) {
    application.country = input.country;
  }

  if (input.university) {
    const country = input.country || application.country;
    validateUniversitySelection(country, input.university);
    application.university = input.university;
  }

  if (input.program) {
    application.program = input.program;
  }

  if (input.travelHistory) {
    validateTravelHistory(input.travelHistory);
    application.travelHistory = {
      hasTravelHistory: input.travelHistory.hasTravelHistory,
      details: input.travelHistory.details?.trim() || '',
    };
  }

  if (typeof input.passportValid === 'boolean') {
    application.passportValid = input.passportValid;
  }

  if (typeof input.financialEligible === 'boolean') {
    application.financialEligible = input.financialEligible;
  }

  if (typeof input.consentExtension === 'boolean') {
    application.consentExtension = input.consentExtension;
  }

  if (input.medicalCondition) {
    validateMedicalCondition(input.medicalCondition);
    application.medicalCondition = {
      hasCondition: input.medicalCondition.hasCondition,
      details: input.medicalCondition.details?.trim() || '',
    };
  }

  if (typeof input.registrationNumber === 'string') {
    application.registrationNumber = input.registrationNumber.trim();
  }

  if (input.accommodationPreference) {
    application.accommodationPreference = input.accommodationPreference;
  }
};

const validateSubmission = (application: IApplication) => {
  if (!application.country || !application.university || !application.program) {
    throw new Error('Country, university, and program are required before submission.');
  }

  validateUniversitySelection(application.country, application.university);
  validateTravelHistory(application.travelHistory);
  validateMedicalCondition(application.medicalCondition);

  if (!application.registrationNumber.trim()) {
    throw new Error('Registration number is required before submission.');
  }

  if (!application.passportValid) {
    throw new Error('A valid passport is required before submission.');
  }
};

const buildSubmissionWarnings = (application: IApplication) => {
  const warnings: string[] = [];

  if (!application.financialEligible) {
    warnings.push('Financial eligibility is flagged for advisor review.');
  }

  return warnings;
};

export const createApplication = async (studentId: string, payload: ApplicationStepInput) => {
  if (!payload.country || !payload.university || !payload.program) {
    throw new Error('country, university, and program are required.');
  }

  validateUniversitySelection(payload.country, payload.university);
  validateTravelHistory(payload.travelHistory);
  validateMedicalCondition(payload.medicalCondition);

  return Application.create({
    studentId,
    country: payload.country,
    university: payload.university,
    program: payload.program,
    travelHistory: {
      hasTravelHistory: payload.travelHistory?.hasTravelHistory || false,
      details: payload.travelHistory?.details?.trim() || '',
    },
    passportValid: payload.passportValid || false,
    financialEligible: payload.financialEligible || false,
    consentExtension: payload.consentExtension || false,
    medicalCondition: {
      hasCondition: payload.medicalCondition?.hasCondition || false,
      details: payload.medicalCondition?.details?.trim() || '',
    },
    registrationNumber: payload.registrationNumber?.trim() || '',
    accommodationPreference:
      payload.accommodationPreference || AccommodationPreference.UNIVERSITY,
    status: ApplicationStatus.DRAFT,
    documents: [],
    selectedCourses: [],
  });
};

export const updateApplicationStep = async (
  applicationId: string,
  studentId: string,
  payload: ApplicationStepInput
) => {
  const application = ensureApplicationAccess(await Application.findById(applicationId), studentId);

  if (application.status === ApplicationStatus.REJECTED) {
    throw new Error('Rejected applications cannot be modified.');
  }

  applyStepInput(application, payload);
  await application.save();
  return application;
};

export const getApplicationById = async (applicationId: string) => {
  const application = await Application.findById(applicationId).populate('studentId', 'name email sapId');
  if (!application) {
    throw new Error('Application not found.');
  }

  return application;
};

export const getStudentApplications = async (studentId: string) =>
  Application.find({ studentId }).sort({ createdAt: -1 });

export const submitApplication = async (applicationId: string, studentId: string) => {
  const application = ensureApplicationAccess(await Application.findById(applicationId), studentId);
  validateSubmission(application);
  application.status = ApplicationStatus.PENDING_INTERVIEW;
  await application.save();

  return {
    application,
    warnings: buildSubmissionWarnings(application),
  };
};

export const scheduleInterview = async (
  applicationId: string,
  interview: {
    date: Date;
    location: string;
    stakeholders: string[];
  }
) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new Error('Application not found.');
  }

  if (application.status !== ApplicationStatus.PENDING_INTERVIEW) {
    throw new Error('Only applications pending interview can be scheduled.');
  }

  application.interview = interview;
  application.status = ApplicationStatus.INTERVIEW_SCHEDULED;
  await application.save();
  return application;
};

export const updateStatus = async (applicationId: string, status: ApplicationStatus) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new Error('Application not found.');
  }

  if (![ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED].includes(status)) {
    throw new Error('Only shortlist or reject decisions are supported here.');
  }

  if (![ApplicationStatus.PENDING_INTERVIEW, ApplicationStatus.INTERVIEW_SCHEDULED].includes(application.status)) {
    throw new Error('The application is not ready for an advisor decision.');
  }

  application.status = status;
  await application.save();
  return application;
};

export const uploadDocuments = async (
  applicationId: string,
  studentId: string,
  documents: Array<{ type: string; fileUrl: string }>
) => {
  const application = ensureApplicationAccess(await Application.findById(applicationId), studentId);

  if (![ApplicationStatus.SHORTLISTED, ApplicationStatus.DOCUMENT_PENDING, ApplicationStatus.COURSE_SELECTION_PENDING, ApplicationStatus.READY_FOR_SUBMISSION].includes(application.status)) {
    throw new Error('Documents can only be uploaded after shortlisting.');
  }

  application.documents.push(...documents);
  application.status = calculatePostShortlistStatus(application);
  await application.save();
  return application;
};

export const selectCourses = async (
  applicationId: string,
  studentId: string,
  courseNames: string[]
) => {
  const application = ensureApplicationAccess(await Application.findById(applicationId), studentId);

  if (![ApplicationStatus.SHORTLISTED, ApplicationStatus.DOCUMENT_PENDING, ApplicationStatus.COURSE_SELECTION_PENDING, ApplicationStatus.READY_FOR_SUBMISSION].includes(application.status)) {
    throw new Error('Courses can only be selected after shortlisting.');
  }

  application.selectedCourses = courseNames
    .map((courseName) => courseName.trim())
    .filter(Boolean)
    .map((courseName) => ({ courseName }));
  application.status = calculatePostShortlistStatus(application);
  await application.save();
  return application;
};
