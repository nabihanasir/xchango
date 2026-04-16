import mongoose from 'mongoose';
import Application, {
  AccommodationPreference,
  ApplicationCountry,
  ApplicationStatus,
  IApplication,
} from '../models/Application';
import User, { UserRole } from '../models/User';
import AdvisorProfile from '../models/AdvisorProfile';
import Course, { CourseType, ICourse } from '../models/Course';
import University from '../models/University';
import { ensureStudentProfile } from './studentService';
import {
  getCourseRecommendations,
  type RecommendationStudentProfile,
} from './aiRecommendation.service';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors/AppError';

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

interface CourseDecisionInput {
  courseId: string;
  status: 'approved' | 'rejected';
  advisorComment?: string;
}

const accessibleStatusesForCourseWork = [
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.DOCUMENT_PENDING,
  ApplicationStatus.COURSE_SELECTION_PENDING,
  ApplicationStatus.READY_FOR_SUBMISSION,
] as const;

const normalizeText = (value?: string) => value?.trim().toLowerCase() || '';

const getReferencedId = (value: unknown) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && '_id' in value && (value as { _id?: unknown })._id != null) {
    return String((value as { _id: unknown })._id);
  }

  return String(value);
};

const ensureObjectId = (value: string, message: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ValidationError(
      'Invalid identifier.',
      message,
      'Provide a valid identifier and try again.',
      'INVALID_IDENTIFIER'
    );
  }
};

const ensureApplicationAccess = (application: IApplication | null, studentId: string) => {
  if (!application) {
    throw new NotFoundError(
      'Application not found.',
      'No application exists for the provided identifier.',
      'Verify the application id and try again.',
      'APPLICATION_NOT_FOUND'
    );
  }

  if (getReferencedId(application.studentId) !== studentId) {
    throw new ForbiddenError(
      'You are not authorized to access this application.',
      'The application belongs to a different student.',
      'Access the application using the correct student account.',
      'APPLICATION_ACCESS_DENIED'
    );
  }

  return application;
};

const ensureApplicationExists = (application: IApplication | null) => {
  if (!application) {
    throw new NotFoundError(
      'Application not found.',
      'No application exists for the provided identifier.',
      'Verify the application id and try again.',
      'APPLICATION_NOT_FOUND'
    );
  }

  return application;
};

const ensureAdvisorOwnsApplication = (application: IApplication, advisorId: string) => {
  if (!application.advisorId || getReferencedId(application.advisorId) !== advisorId) {
    throw new ForbiddenError(
      'You are not authorized to access this application.',
      'This application is not assigned to the current advisor.',
      'Open an application assigned to you or contact an administrator.',
      'ADVISOR_ACCESS_DENIED'
    );
  }

  return application;
};

const ensureCourseWorkStatus = (application: IApplication) => {
  if (!accessibleStatusesForCourseWork.includes(application.status as (typeof accessibleStatusesForCourseWork)[number])) {
    throw new ValidationError(
      'Course request is not available yet.',
      'Course decisions are only available after the application reaches the course request stage.',
      'Complete the interview workflow before requesting or reviewing courses.',
      'COURSE_REQUEST_NOT_AVAILABLE'
    );
  }

  return application;
};

const populateApplication = <T>(query: T) => {
  return (query as any)
    .populate('studentId', 'name email sapId phone role')
    .populate('advisorId', 'name email role')
    .populate({
      path: 'selectedCourses.course',
      select: 'name code description outlineText creditHours type universityId',
      populate: {
        path: 'universityId',
        select: 'name',
      },
    })
    .populate({
      path: 'aiRecommendations.course',
      select: 'name code description outlineText creditHours type universityId',
      populate: {
        path: 'universityId',
        select: 'name',
      },
    });
};

const validateUniversitySelection = (country: ApplicationCountry, university: string) => {
  const supportedUniversities = applicationOptions[country];
  if (!supportedUniversities) {
    throw new ValidationError(
      'Selected country is not supported.',
      'The selected country is outside the configured application destinations.',
      'Choose one of the supported countries and try again.',
      'COUNTRY_NOT_SUPPORTED'
    );
  }

  if (!supportedUniversities.includes(university)) {
    throw new ValidationError(
      'Selected university is not available for the chosen country.',
      'The selected university does not belong to the chosen country.',
      'Choose a listed university for the selected country.',
      'UNIVERSITY_NOT_ALLOWED'
    );
  }
};

const validateMedicalCondition = (input?: ApplicationStepInput['medicalCondition']) => {
  if (input?.hasCondition && !input.details?.trim()) {
    throw new ValidationError(
      'Medical condition details are required.',
      'A medical condition was marked as present but no details were submitted.',
      'Add the required details and try again.',
      'MEDICAL_DETAILS_REQUIRED'
    );
  }
};

const validateTravelHistory = (input?: ApplicationStepInput['travelHistory']) => {
  if (input?.hasTravelHistory && !input.details?.trim()) {
    throw new ValidationError(
      'Travel history details are required.',
      'Travel history was marked as present but no details were submitted.',
      'Add the required details and try again.',
      'TRAVEL_HISTORY_DETAILS_REQUIRED'
    );
  }
};

const assertProfileComplete = async (studentId: string) => {
  const profile = await ensureStudentProfile(studentId);

  if (profile.isProfileComplete) {
    return profile;
  }

  const missing = profile.profileCompletionIssues.length
    ? profile.profileCompletionIssues.join(' and ')
    : 'required profile fields';

  throw new ValidationError(
    `Profile incomplete. Missing ${missing}.`,
    'The student profile must be completed before this workflow step is allowed.',
    'Complete the student profile and upload all required records before trying again.',
    'PROFILE_INCOMPLETE'
  );
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
    throw new ValidationError(
      'Registration number is required before submission.',
      'The application does not include a registration number.',
      'Add the registration number and try again.',
      'REGISTRATION_NUMBER_REQUIRED'
    );
  }

  if (!application.passportValid) {
    throw new ValidationError(
      'A valid passport is required before submission.',
      'Passport validity was not confirmed for this application.',
      'Confirm passport validity before submitting.',
      'PASSPORT_REQUIRED'
    );
  }
};

const buildSubmissionWarnings = (application: IApplication) => {
  const warnings: string[] = [];

  if (!application.financialEligible) {
    warnings.push('Financial eligibility is flagged for advisor review.');
  }

  return warnings;
};

const buildRecommendationStudentProfile = async (
  application: IApplication
): Promise<RecommendationStudentProfile> => {
  const profile = await ensureStudentProfile(getReferencedId(application.studentId));
  const transcriptCourseNames = profile.transcript.semesters.flatMap((semester) =>
    semester.courses.map((course) => course.courseName)
  );

  return {
    degreeLevel: profile.preferences.degreeLevel,
    background: [
      profile.program,
      profile.basicInfo.department,
      application.program,
      profile.registrationNumber ? `Registration ${profile.registrationNumber}` : '',
    ]
      .filter(Boolean)
      .join(' '),
    gpa: profile.cgpa || profile.transcript.cgpa || 0,
    interests: [
      profile.preferences.fieldOfInterest,
      ...profile.preferences.preferredCountries,
      application.program,
    ].filter(Boolean),
    transcriptCourses: transcriptCourseNames,
    targetProgram: application.program,
  };
};

const getAvailableCoursesForApplication = async (application: IApplication): Promise<ICourse[]> => {
  const applicationUniversity = normalizeText(application.university);
  const universities = await University.find().populate('countryId', 'name');

  const exactUniversityIds = universities
    .filter((university: any) => normalizeText(university.name) === applicationUniversity)
    .map((university) => university._id);

  const countryUniversityIds = universities
    .filter((university: any) => normalizeText(university.countryId?.name) === normalizeText(application.country))
    .map((university) => university._id);

  const preferredUniversityIds = exactUniversityIds.length ? exactUniversityIds : countryUniversityIds;

  const preferredCourses = await Course.find({
    type: CourseType.HOST,
    ...(preferredUniversityIds.length ? { universityId: { $in: preferredUniversityIds } } : {}),
  })
    .populate('universityId', 'name')
    .sort({ code: 1, name: 1 });

  if (preferredCourses.length) {
    return preferredCourses;
  }

  return Course.find({ type: CourseType.HOST })
    .populate('universityId', 'name')
    .sort({ code: 1, name: 1 });
};

export const createApplication = async (studentId: string, payload: ApplicationStepInput) => {
  await assertProfileComplete(studentId);

  if (!payload.country || !payload.university || !payload.program) {
    throw new ValidationError(
      'Country, university, and program are required.',
      'The application draft is missing one or more required academic destination fields.',
      'Provide country, university, and program before creating the application.',
      'APPLICATION_FIELDS_MISSING'
    );
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
    aiRecommendations: [],
  });
};

export const updateApplicationStep = async (
  applicationId: string,
  studentId: string,
  payload: ApplicationStepInput
) => {
  const application = ensureApplicationAccess(await Application.findById(applicationId), studentId);

  if (application.status === ApplicationStatus.REJECTED) {
    throw new ValidationError(
      'Rejected applications cannot be modified.',
      'This application has already been rejected.',
      'Create a new application if the student needs to reapply.',
      'APPLICATION_LOCKED'
    );
  }

  applyStepInput(application, payload);
  await application.save();
  return application;
};

export const getApplicationById = async (
  applicationId: string,
  actor: { _id: string; role: UserRole }
) => {
  const application = ensureApplicationExists(
    await populateApplication(Application.findById(applicationId))
  );

  if (actor.role === UserRole.ADMIN) {
    return application;
  }

  if (actor.role === UserRole.STUDENT) {
    return ensureApplicationAccess(application, actor._id);
  }

  if (actor.role === UserRole.ADVISOR) {
    return ensureAdvisorOwnsApplication(application, actor._id);
  }

  throw new ForbiddenError(
    'You are not authorized to access this application.',
    'The current user role cannot access this application.',
    'Use a student, advisor, or admin account with valid access.',
    'APPLICATION_ACCESS_DENIED'
  );
};

export const getStudentApplications = async (studentId: string) =>
  populateApplication(Application.find({ studentId }).sort({ createdAt: -1 }));

export const getAdvisorApplications = async (advisorId: string) =>
  populateApplication(Application.find({ advisorId }).sort({ createdAt: -1 }));

export const submitApplication = async (applicationId: string, studentId: string) => {
  await assertProfileComplete(studentId);
  const application = ensureApplicationAccess(await Application.findById(applicationId), studentId);
  validateSubmission(application);
  application.status = ApplicationStatus.PENDING;
  await application.save();

  return {
    application,
    warnings: buildSubmissionWarnings(application),
  };
};

export const assignAdvisor = async (applicationId: string, advisorId: string) => {
  const application = ensureApplicationExists(await Application.findById(applicationId));
  const advisor = await User.findById(advisorId);
  const assignableStatuses = [
    ApplicationStatus.DRAFT,
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.PENDING,
    ApplicationStatus.PENDING_INTERVIEW,
    ApplicationStatus.ASSIGNED,
  ];

  if (!advisor || advisor.role !== UserRole.ADVISOR) {
    throw new NotFoundError(
      'Advisor not found.',
      'The selected advisor account does not exist or is not an advisor.',
      'Select a valid advisor and try again.',
      'ADVISOR_NOT_FOUND'
    );
  }

  if (!assignableStatuses.includes(application.status)) {
    throw new ValidationError(
      'Advisor assignment is not allowed for this application.',
      `Applications in status ${application.status} cannot be assigned or reassigned to an advisor.`,
      'Choose an application that is still awaiting advisor assignment.',
      'APPLICATION_NOT_PENDING'
    );
  }

  application.advisorId = advisor._id as any;
  application.status = ApplicationStatus.ASSIGNED;
  await application.save();

  const assignedStudentIds = await Application.distinct('studentId', { advisorId });
  await AdvisorProfile.findOneAndUpdate(
    { userId: advisorId },
    { assignedStudents: assignedStudentIds }
  );

  return getApplicationById(applicationId, { _id: advisorId, role: UserRole.ADVISOR });
};

export const scheduleInterview = async (
  applicationId: string,
  advisorId: string,
  interview: {
    date: Date;
    location: string;
    stakeholders: string[];
  }
) => {
  const application = ensureAdvisorOwnsApplication(
    ensureApplicationExists(await Application.findById(applicationId)),
    advisorId
  );

  if (![ApplicationStatus.ASSIGNED, ApplicationStatus.INTERVIEW_SCHEDULED].includes(application.status)) {
    throw new ValidationError(
      'Interview scheduling is not allowed yet.',
      'Only assigned applications can be scheduled for interview.',
      'Assign an advisor first and then schedule the interview.',
      'INTERVIEW_SCHEDULING_NOT_ALLOWED'
    );
  }

  application.interviewDate = interview.date;
  application.interview = interview;
  application.status = ApplicationStatus.INTERVIEW_SCHEDULED;
  await application.save();
  return getApplicationById(applicationId, { _id: advisorId, role: UserRole.ADVISOR });
};

export const completeInterview = async (applicationId: string, advisorId: string) => {
  const application = ensureAdvisorOwnsApplication(
    ensureApplicationExists(await Application.findById(applicationId)),
    advisorId
  );

  if (application.status !== ApplicationStatus.INTERVIEW_SCHEDULED) {
    throw new ValidationError(
      'Interview not scheduled yet.',
      'Only scheduled interviews can be marked as completed.',
      'Schedule the interview before marking it as completed.',
      'INTERVIEW_NOT_SCHEDULED'
    );
  }

  if (!application.interviewDate && !application.interview?.date) {
    throw new ValidationError(
      'Interview date is required.',
      'The interview record does not include a scheduled date.',
      'Set the interview date before marking the interview as completed.',
      'INTERVIEW_DATE_REQUIRED'
    );
  }

  application.status = ApplicationStatus.INTERVIEW_COMPLETED;
  await application.save();
  return getApplicationById(applicationId, { _id: advisorId, role: UserRole.ADVISOR });
};

export const updateStatus = async (
  applicationId: string,
  advisorId: string,
  status: ApplicationStatus
) => {
  const application = ensureAdvisorOwnsApplication(
    ensureApplicationExists(await Application.findById(applicationId)),
    advisorId
  );

  if (![ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED].includes(status)) {
    throw new Error('Only shortlist or reject decisions are supported here.');
  }

  if (![ApplicationStatus.PENDING_INTERVIEW, ApplicationStatus.INTERVIEW_SCHEDULED].includes(application.status)) {
    throw new Error('The application is not ready for an advisor decision.');
  }

  application.status = status;
  await application.save();
  return getApplicationById(applicationId, { _id: advisorId, role: UserRole.ADVISOR });
};

export const uploadDocuments = async (
  applicationId: string,
  studentId: string,
  documents: Array<{ type: string; fileUrl: string }>
) => {
  const application = ensureApplicationAccess(await Application.findById(applicationId), studentId);

  if (!accessibleStatusesForCourseWork.includes(application.status as (typeof accessibleStatusesForCourseWork)[number])) {
    throw new ValidationError(
      'Documents can only be uploaded after shortlisting.',
      'The application has not reached the document upload stage.',
      'Wait until the application is shortlisted before uploading documents.',
      'DOCUMENT_UPLOAD_NOT_ALLOWED'
    );
  }

  application.documents.push(...documents);
  application.status = calculatePostShortlistStatus(application);
  await application.save();
  return getApplicationById(applicationId, { _id: studentId, role: UserRole.STUDENT });
};

export const listAvailableCourses = async (
  applicationId: string,
  actor: { _id: string; role: UserRole }
) => {
  const application = await getApplicationById(applicationId, actor);
  if (
    ![
      ApplicationStatus.INTERVIEW_COMPLETED,
      ApplicationStatus.COURSE_REQUEST_ENABLED,
      ...accessibleStatusesForCourseWork,
    ].includes(application.status as ApplicationStatus)
  ) {
    throw new ValidationError(
      'Interview not completed yet.',
      'Course approval can only be requested after the advisor interview is completed.',
      'Complete the advisor interview before requesting course approval.',
      'INTERVIEW_NOT_COMPLETED'
    );
  }

  return getAvailableCoursesForApplication(application as IApplication);
};

export const selectCourses = async (
  applicationId: string,
  studentId: string,
  courseIds: string[]
) => {
  const application = ensureApplicationAccess(await Application.findById(applicationId), studentId);
  if (![ApplicationStatus.INTERVIEW_COMPLETED, ApplicationStatus.COURSE_REQUEST_ENABLED].includes(application.status)) {
    throw new ValidationError(
      'Interview not completed yet.',
      'You must complete your advisor interview before requesting course approval.',
      'Wait until the interview is marked completed, then submit course requests.',
      'INTERVIEW_NOT_COMPLETED'
    );
  }

  const normalizedIds = Array.from(
    new Set(
      courseIds
        .map((courseId) => courseId?.trim())
        .filter(Boolean)
    )
  );

  normalizedIds.forEach((courseId) => ensureObjectId(courseId, 'One or more selected course IDs are invalid.'));

  const availableCourses = await getAvailableCoursesForApplication(application);
  const availableCourseIds = new Set(availableCourses.map((course) => course._id.toString()));

  normalizedIds.forEach((courseId) => {
    if (!availableCourseIds.has(courseId)) {
      throw new ValidationError(
        'One or more selected courses are not available for this application.',
        'At least one selected course does not match the current application scope.',
        'Refresh the course list and choose available courses only.',
        'COURSE_NOT_AVAILABLE'
      );
    }
  });

  application.selectedCourses = normalizedIds.map((courseId) => ({
    course: new mongoose.Types.ObjectId(courseId),
    status: 'pending',
    advisorComment: '',
  })) as IApplication['selectedCourses'];
  application.status = ApplicationStatus.COURSE_REQUEST_ENABLED;
  await application.save();
  return getApplicationById(applicationId, { _id: studentId, role: UserRole.STUDENT });
};

export const generateAiRecommendations = async (applicationId: string, advisorId: string) => {
  const application = ensureCourseWorkStatus(
    ensureAdvisorOwnsApplication(
      ensureApplicationExists(await Application.findById(applicationId)),
      advisorId
    )
  );

  const [studentProfile, availableCourses] = await Promise.all([
    buildRecommendationStudentProfile(application),
    getAvailableCoursesForApplication(application),
  ]);

  const recommendations = getCourseRecommendations(studentProfile, availableCourses);
  application.aiRecommendations = recommendations.map((recommendation) => ({
    course: recommendation.courseId,
    matchScore: recommendation.matchScore,
    reason: recommendation.reason,
  })) as IApplication['aiRecommendations'];

  await application.save();
  return getApplicationById(applicationId, { _id: advisorId, role: UserRole.ADVISOR });
};

export const getAiRecommendations = async (applicationId: string, advisorId: string) => {
  const application = ensureAdvisorOwnsApplication(
    ensureApplicationExists(
      await populateApplication(Application.findById(applicationId))
    ),
    advisorId
  );

  return application.aiRecommendations;
};

export const updateCourseDecision = async (
  applicationId: string,
  advisorId: string,
  payload: CourseDecisionInput
) => {
  ensureObjectId(payload.courseId, 'Invalid course ID.');

  const application = ensureCourseWorkStatus(
    ensureAdvisorOwnsApplication(
      ensureApplicationExists(await Application.findById(applicationId)),
      advisorId
    )
  );

  const selectedCourse = application.selectedCourses.find(
    (courseItem) => courseItem.course.toString() === payload.courseId
  );

  if (!selectedCourse) {
    throw new NotFoundError(
      'Selected course not found.',
      'The chosen course is not attached to this application.',
      'Refresh the application and try again.',
      'SELECTED_COURSE_NOT_FOUND'
    );
  }

  selectedCourse.status = payload.status;
  selectedCourse.advisorComment = payload.advisorComment?.trim() || '';

  await application.save();
  return getApplicationById(applicationId, { _id: advisorId, role: UserRole.ADVISOR });
};

export const advisorCanAccessStudent = async (advisorId: string, studentId: string) => {
  const application = await Application.exists({ advisorId, studentId });
  return Boolean(application);
};

export const studentCanRequestCourseApproval = async (studentId: string) => {
  const application = await Application.findOne({
    studentId,
    status: {
      $in: [ApplicationStatus.INTERVIEW_COMPLETED, ApplicationStatus.COURSE_REQUEST_ENABLED],
    },
  }).sort({ updatedAt: -1 });

  return Boolean(application);
};
