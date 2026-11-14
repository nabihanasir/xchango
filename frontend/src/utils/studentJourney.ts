import { isNotRecommended, recommendedApplicationStatuses, type WorkflowApplication } from '../types/application';
import type { StudentDocument } from '../types/document';
import type { CourseRequest } from '../types/equivalency';
import type { StudentResult } from '../types/result';
import type { StudentVisaProcess } from '../types/visa';
import { getCourseStepState } from './courseStep';
import { VISA_STATUS_META } from './visa';

export type JourneyStepKey =
  | 'registration'
  | 'interview'
  | 'shortlisting'
  | 'course-selection'
  | 'course-approval'
  | 'documents'
  | 'visa'
  | 'arrival'
  | 'outline'
  | 'results';

/**
 * done: finished. current: the next thing to do. locked: not reachable yet. stopped: blocked, needs attention.
 * Steps follow a strict order: a step is only ever done, current or stopped when every step before it is done, and a
 * stopped step (not recommended, rejected, visa rejected) locks everything after it. The backend enforces the same
 * rules (backend/src/services/journeyGateService.ts).
 */
export type JourneyStepState = 'done' | 'current' | 'locked' | 'stopped';

export interface JourneyStep {
  key: JourneyStepKey;
  title: string;
  description: string;
  state: JourneyStepState;
  /** Page the step belongs to. Finished and current steps link here. */
  to: string;
  /** Button label shown when this is the current step and the student has something to do. */
  actionLabel?: string;
  /** 'report-arrival' makes the action a button that calls the API instead of a link. */
  actionKind?: 'link' | 'report-arrival';
}

export interface JourneyInput {
  application: WorkflowApplication | null;
  requests: CourseRequest[];
  documents: StudentDocument[];
  /** The transcript is uploaded on the Student Profile page. */
  transcriptUploaded?: boolean;
  visa: StudentVisaProcess | null;
  results: StudentResult[];
}

const INTERVIEW_FINISHED_STATUSES = [
  'INTERVIEW_COMPLETED',
  'COURSE_REQUEST_ENABLED',
  'SHORTLISTED',
  'DOCUMENT_PENDING',
  'COURSE_SELECTION_PENDING',
  'READY_FOR_SUBMISSION',
  'COMPLETED',
];

/** The student's most recent application is the one the journey follows. */
export const pickJourneyApplication = (applications: WorkflowApplication[]) =>
  [...applications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

interface Draft extends Omit<JourneyStep, 'state'> {
  done: boolean;
  stopped?: boolean;
}

export const buildStudentJourney = ({
  application,
  requests,
  documents,
  transcriptUploaded,
  visa,
  results,
}: JourneyInput): JourneyStep[] => {
  const applicationHome = '/dashboard/applications';
  const applicationPage = application ? `${applicationHome}/${application._id}` : `${applicationHome}/new`;
  const submitted = Boolean(application) && application!.status !== 'DRAFT';
  const status = application?.status;

  // Registration
  const registration: Draft = {
    key: 'registration',
    title: 'Registration',
    done: submitted,
    to: applicationHome,
    ...(submitted
      ? { description: 'Your registration has been submitted.' }
      : application
        ? { description: 'Finish your registration and submit it.', actionLabel: 'Continue registration', to: applicationPage }
        : { description: 'Choose a university and programme to register.', actionLabel: 'Start registration', to: applicationPage }),
  };

  // Interview
  const interviewDone =
    Boolean(application) && (Boolean(application!.interviewDecision) || INTERVIEW_FINISHED_STATUSES.includes(status!));
  const interviewDescription = !submitted
    ? 'Available once you submit your registration.'
    : interviewDone
      ? 'Your interview is complete.'
      : status === 'INTERVIEW_SCHEDULED'
        ? `Your interview is scheduled${application!.interviewDate ? ` for ${formatDate(application!.interviewDate)}` : ''}.`
        : status === 'PENDING'
          ? 'Waiting for an advisor to be assigned for your country.'
          : application!.interviewRequest?.status === 'requested'
            ? 'You asked for an interview time. Waiting for your advisor to confirm it.'
            : 'Pick a time for your interview with your advisor.';
  const interview: Draft = {
    key: 'interview',
    title: 'Interview',
    done: interviewDone,
    to: applicationHome,
    description: interviewDescription,
    actionLabel: submitted && !interviewDone ? 'View registration' : undefined,
  };
  if (interview.actionLabel) interview.to = applicationPage;
  // Once an advisor is assigned the student books the interview slot on the Registration page.
  if (status === 'ASSIGNED') {
    interview.actionLabel = application!.interviewRequest?.status === 'requested' ? 'View your request' : 'Book your interview';
    interview.to = applicationHome;
  }

  // Shortlisting (the advisor's decision after the interview)
  const notRecommended = Boolean(application) && isNotRecommended(application!);
  const rejected = status === 'REJECTED';
  const shortlistDone = Boolean(application) && (recommendedApplicationStatuses.includes(status!) || status === 'COMPLETED');
  const shortlisting: Draft = {
    key: 'shortlisting',
    title: 'Shortlisting',
    done: shortlistDone,
    stopped: rejected,
    to: applicationHome,
    description: notRecommended
      ? 'Your advisor did not recommend your application, so it cannot proceed.'
      : rejected
        ? 'Your application was rejected, so it cannot proceed.'
        : shortlistDone
        ? 'Your advisor recommended you and you are shortlisted.'
        : interviewDone
          ? 'Waiting for your advisor to record their decision.'
          : 'Follows your interview.',
    actionLabel: rejected || (interviewDone && !shortlistDone) ? 'View decision' : undefined,
  };
  if (shortlisting.actionLabel) shortlisting.to = applicationPage;

  // Course selection and approval
  const courseState = getCourseStepState(requests);
  const selectionDone = courseState === 'in_review' || courseState === 'approved';
  const courseSelection: Draft = {
    key: 'course-selection',
    title: 'Course selection',
    done: selectionDone,
    to: '/dashboard/courses',
    ...(selectionDone
      ? { description: 'Your course request has been sent to your advisor.' }
      : courseState === 'rejected'
        ? { description: 'Your request was not approved. Review the advisor comments and resubmit.', actionLabel: 'Resubmit request' }
        : { description: 'Choose the host courses you want approved and send them to your advisor.', actionLabel: 'Choose courses' }),
  };
  // The student reports arriving; the advisor or International Office confirms by recording it.
  const arrived = Boolean(application?.arrival?.arrivedAt) || requests.some((request) => request.outlineUploadOpen);
  const courseApproval: Draft = {
    key: 'course-approval',
    title: 'Course approval',
    // Uploading an outline sends an approved request back to review, but arrival is only recorded after approval.
    done: courseState === 'approved' || arrived,
    to: '/dashboard/courses',
    description:
      courseState === 'approved' || arrived
        ? 'Your advisor approved your courses.'
        : courseState === 'in_review'
          ? 'Your request is with your advisor.'
          : 'Follows course selection.',
    actionLabel: courseState === 'in_review' ? 'View request' : undefined,
  };

  // Documents
  const uploadedTypes = new Set(documents.map((document) => document.type));
  // The transcript counts when it is on the profile page, or as a document uploaded before it moved there.
  const documentsDone = Boolean(transcriptUploaded) || uploadedTypes.has('transcript');
  const documentStep: Draft = {
    key: 'documents',
    title: 'Documents',
    done: documentsDone,
    to: documentsDone ? '/dashboard/documents' : '/dashboard/profile',
    description: documentsDone
      ? 'Your transcript is uploaded. A CV and passport are optional.'
      : 'Upload your transcript on your Student Profile page. A CV and passport are optional.',
    actionLabel: 'Upload transcript',
  };

  // Visa
  const visaStatus = visa?.status ?? 'not_started';
  const visaStep: Draft = {
    key: 'visa',
    title: 'Visa',
    done: visaStatus === 'approved',
    stopped: visaStatus === 'rejected',
    to: '/dashboard/visa',
    description:
      visaStatus === 'approved'
        ? 'Your visa has been approved.'
        : visaStatus === 'rejected'
          ? 'Your visa was rejected. See the remarks for what to do next.'
          : `Visa status: ${VISA_STATUS_META[visaStatus].label}.`,
    actionLabel: 'View visa status',
  };

  const reportedAt = application?.arrivalReport?.reportedAt;
  const canReport = Boolean(application) && recommendedApplicationStatuses.includes(status!) && !reportedAt;
  const arrival: Draft = {
    key: 'arrival',
    title: 'Arrival',
    done: arrived,
    to: applicationHome,
    description: arrived
      ? `Your arrival was recorded${application?.arrival?.arrivedAt ? ` on ${formatDate(application.arrival.arrivedAt)}` : ''}.`
      : reportedAt
        ? `You told your advisor you arrived on ${formatDate(reportedAt)}. Waiting for them to confirm it.`
        : 'Reached the host country? Let your advisor know so they can confirm your arrival.',
    actionLabel: canReport ? 'I have arrived' : undefined,
    actionKind: canReport ? 'report-arrival' : undefined,
  };

  // Outline upload (host course outlines, opened by arrival)
  const approvedItems = requests.flatMap((request) => request.items.filter((item) => item.status === 'approved'));
  const outlinesUploaded = approvedItems.filter((item) => item.uploadedOutline).length;
  const outlineDone = approvedItems.length > 0 && outlinesUploaded === approvedItems.length;
  const outline: Draft = {
    key: 'outline',
    title: 'Outline upload',
    done: outlineDone,
    to: '/dashboard/courses',
    description: outlineDone
      ? 'Outlines uploaded for all your courses.'
      : arrived
        ? `Upload the course outline you received for each course (${outlinesUploaded} of ${approvedItems.length || 0} uploaded).`
        : 'Opens once your arrival is recorded.',
    actionLabel: arrived ? 'Upload outlines' : undefined,
  };

  // Results
  const hasResults = results.some((result) => result.status === 'published');
  const resultsStep: Draft = {
    key: 'results',
    title: 'Results',
    done: hasResults,
    to: '/dashboard/results',
    description: hasResults ? 'Your results have been published.' : 'Your advisor publishes your grades after the semester.',
    actionLabel: 'View results',
  };

  const drafts = [
    registration,
    interview,
    shortlisting,
    courseSelection,
    courseApproval,
    documentStep,
    visaStep,
    arrival,
    outline,
    resultsStep,
  ];

  const stoppedIndex = drafts.findIndex((draft) => draft.stopped);
  let blocked = false;

  return drafts.map(({ done, stopped, ...step }, index): JourneyStep => {
    // A stopped step wins over everything, and every step after it stays locked.
    if (stopped && index === stoppedIndex) {
      blocked = true;
      return { ...step, state: 'stopped' };
    }

    if (blocked) {
      return { ...step, state: 'locked' };
    }

    // A step can only be done while every step before it is done, so the first open step is the current one and
    // everything after it is locked, even if it already looks finished.
    if (done) {
      return { ...step, state: 'done' };
    }

    blocked = true;
    return { ...step, state: 'current' };
  });
};
