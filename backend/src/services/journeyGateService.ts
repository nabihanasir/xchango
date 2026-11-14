import { ValidationError } from '../errors/AppError';
import Application, { ApplicationStatus } from '../models/Application';
import CourseRequest, { CourseRequestItemStatus, CourseRequestStatus } from '../models/CourseRequest';
import Result, { ResultStatus } from '../models/Result';
import StudentProfile from '../models/StudentProfile';
import VisaProcess, { VisaStatus } from '../models/VisaProcess';

/**
 * The student's exchange journey, in order. Mirrors the Progress tracker on the student dashboard
 * (frontend/src/utils/studentJourney.ts): a step only counts as done when every step before it is done,
 * and a stopped application (not recommended, rejected, visa rejected) blocks every step after it.
 */
export const JOURNEY_STEPS = [
  'registration',
  'interview',
  'shortlisting',
  'course-selection',
  'course-approval',
  'documents',
  'visa',
  'arrival',
  'outline',
  'results',
] as const;

export type JourneyStepKey = (typeof JOURNEY_STEPS)[number];
export type JourneyStepState = 'done' | 'current' | 'locked' | 'stopped';

const STEP_LABELS: Record<JourneyStepKey, string> = {
  registration: 'Registration',
  interview: 'Interview',
  shortlisting: 'Shortlisting',
  'course-selection': 'Course selection',
  'course-approval': 'Course approval',
  documents: 'Documents',
  visa: 'Visa',
  arrival: 'Arrival',
  outline: 'Outline upload',
  results: 'Results',
};

const INTERVIEW_FINISHED_STATUSES = [
  ApplicationStatus.INTERVIEW_COMPLETED,
  ApplicationStatus.COURSE_REQUEST_ENABLED,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.DOCUMENT_PENDING,
  ApplicationStatus.COURSE_SELECTION_PENDING,
  ApplicationStatus.READY_FOR_SUBMISSION,
  ApplicationStatus.COMPLETED,
];

const RECOMMENDED_STATUSES = [
  ApplicationStatus.COURSE_REQUEST_ENABLED,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.DOCUMENT_PENDING,
  ApplicationStatus.COURSE_SELECTION_PENDING,
  ApplicationStatus.READY_FOR_SUBMISSION,
];

export interface JourneyFacts {
  application: {
    status: ApplicationStatus;
    hasInterviewDecision: boolean;
    /** False when the advisor decided not to recommend the student. */
    recommended?: boolean;
    arrived: boolean;
  } | null;
  courseState: 'none' | 'in_review' | 'approved' | 'rejected';
  transcriptUploaded: boolean;
  visaStatus: VisaStatus;
  approvedItems: number;
  outlinesUploaded: number;
  resultsPublished: boolean;
}

export interface JourneyGate {
  steps: Record<JourneyStepKey, JourneyStepState>;
  /** Set when the application has stopped, naming why. Every step after the stopped one stays locked. */
  stoppedReason: string | null;
}

/** Whether each step is finished on its own, ignoring order. */
const rawDone = (facts: JourneyFacts): Record<JourneyStepKey, boolean> => {
  const application = facts.application;
  const submitted = Boolean(application) && application!.status !== ApplicationStatus.DRAFT;
  const arrived = Boolean(application?.arrived);

  return {
    registration: submitted,
    interview:
      Boolean(application) &&
      (application!.hasInterviewDecision || INTERVIEW_FINISHED_STATUSES.includes(application!.status)),
    shortlisting:
      Boolean(application) &&
      (RECOMMENDED_STATUSES.includes(application!.status) || application!.status === ApplicationStatus.COMPLETED),
    'course-selection': facts.courseState === 'in_review' || facts.courseState === 'approved',
    // An outline upload sends an approved request back to review, but arrival can only be recorded after approval.
    'course-approval': facts.courseState === 'approved' || arrived,
    documents: facts.transcriptUploaded,
    visa: facts.visaStatus === VisaStatus.APPROVED,
    arrival: arrived,
    outline: facts.approvedItems > 0 && facts.outlinesUploaded === facts.approvedItems,
    results: facts.resultsPublished,
  };
};

/** The step that stopped the journey, if any. */
const findStopped = (facts: JourneyFacts): { step: JourneyStepKey; reason: string } | null => {
  const application = facts.application;
  if (application?.status === ApplicationStatus.REJECTED) {
    return {
      step: 'shortlisting',
      reason:
        application.recommended === false
          ? 'Your advisor did not recommend your application, so it cannot proceed.'
          : 'Your application was rejected, so it cannot proceed.',
    };
  }

  if (facts.visaStatus === VisaStatus.REJECTED) {
    return { step: 'visa', reason: 'Your visa was rejected, so the exchange cannot proceed.' };
  }

  return null;
};

export const evaluateJourney = (facts: JourneyFacts): JourneyGate => {
  const done = rawDone(facts);
  const stopped = findStopped(facts);
  const stoppedIndex = stopped ? JOURNEY_STEPS.indexOf(stopped.step) : -1;

  const steps = {} as Record<JourneyStepKey, JourneyStepState>;
  let blocked = false;
  let currentAssigned = false;

  JOURNEY_STEPS.forEach((key, index) => {
    if (stopped && index === stoppedIndex) {
      steps[key] = 'stopped';
      blocked = true;
      return;
    }

    if (blocked) {
      steps[key] = 'locked';
      return;
    }

    if (done[key]) {
      steps[key] = 'done';
      return;
    }

    // The first unfinished step is the current one. Everything after it is locked, even if it looks finished.
    steps[key] = currentAssigned ? 'locked' : 'current';
    currentAssigned = true;
    blocked = true;
  });

  return { steps, stoppedReason: stopped?.reason ?? null };
};

/** Whether the student may act on `step`: every step before it is done and nothing has stopped. */
export const canActOnStep = (gate: JourneyGate, step: JourneyStepKey) => {
  const index = JOURNEY_STEPS.indexOf(step);
  return JOURNEY_STEPS.slice(0, index).every((key) => gate.steps[key] === 'done');
};

const firstUnfinishedBefore = (gate: JourneyGate, step: JourneyStepKey) =>
  JOURNEY_STEPS.slice(0, JOURNEY_STEPS.indexOf(step)).find((key) => gate.steps[key] !== 'done');

export const loadJourneyFacts = async (studentId: string): Promise<JourneyFacts> => {
  const [applications, requests, profile, visa, publishedResult] = await Promise.all([
    Application.find({ studentId }).sort({ createdAt: -1 }).limit(1).lean(),
    CourseRequest.find({ studentId }).select('status items.status items.uploadedOutline.uploadedAt').lean(),
    StudentProfile.findOne({ userId: studentId }).select('transcript.fileUrl').lean(),
    VisaProcess.findOne({ studentId }).select('status').lean(),
    Result.exists({ studentId, status: ResultStatus.PUBLISHED }),
  ]);

  const application = applications[0] ?? null;
  const approvedRequest = requests.find((request) => request.status === CourseRequestStatus.APPROVED);
  const courseState = approvedRequest
    ? 'approved'
    : requests.some((request) =>
          [CourseRequestStatus.PENDING, CourseRequestStatus.UNDER_REVIEW].includes(request.status as CourseRequestStatus)
        )
      ? 'in_review'
      : requests.length
        ? 'rejected'
        : 'none';

  const approvedItems = requests
    .flatMap((request) => request.items ?? [])
    .filter((item) => item.status === CourseRequestItemStatus.APPROVED);

  return {
    application: application
      ? {
          status: application.status,
          hasInterviewDecision: Boolean(application.interviewDecision),
          recommended: application.interviewDecision?.recommended,
          arrived: Boolean(application.arrival?.arrivedAt),
        }
      : null,
    courseState,
    // A transcript uploaded as an application document before it moved to the profile page still counts.
    transcriptUploaded:
      Boolean(profile?.transcript?.fileUrl) || Boolean(application?.documents?.some((document) => document.type === 'transcript')),
    visaStatus: visa?.status ?? VisaStatus.NOT_STARTED,
    approvedItems: approvedItems.length,
    outlinesUploaded: approvedItems.filter((item) => item.uploadedOutline?.uploadedAt).length,
    resultsPublished: Boolean(publishedResult),
  };
};

export const getJourneyGate = async (studentId: string) => evaluateJourney(await loadJourneyFacts(studentId));

/**
 * Refuses an action on `step` unless every earlier step is complete. A stopped application gets its own message,
 * because nothing the student or staff does can move it forward.
 */
export const assertJourneyReady = async (studentId: string, step: JourneyStepKey) => {
  const gate = await getJourneyGate(studentId);
  if (canActOnStep(gate, step)) {
    return gate;
  }

  if (gate.stoppedReason) {
    throw new ValidationError(
      'This application has stopped.',
      gate.stoppedReason,
      'No further steps are available for this application.',
      'JOURNEY_STOPPED'
    );
  }

  const missing = firstUnfinishedBefore(gate, step)!;
  throw new ValidationError(
    `${STEP_LABELS[step]} is not available yet.`,
    `${STEP_LABELS[missing]} must be completed before ${STEP_LABELS[step].toLowerCase()}.`,
    `Complete the ${STEP_LABELS[missing].toLowerCase()} step first.`,
    'JOURNEY_STEP_LOCKED'
  );
};
