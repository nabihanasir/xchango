import { ApplicationStatus } from '../models/Application';
import { VisaStatus } from '../models/VisaProcess';
import { canActOnStep, evaluateJourney, JOURNEY_STEPS, type JourneyFacts } from './journeyGateService';

jest.mock('../models/Application');
jest.mock('../models/CourseRequest', () => ({
  ...jest.requireActual('../models/CourseRequest'),
  __esModule: true,
  default: {},
}));
jest.mock('../models/Result', () => ({ ...jest.requireActual('../models/Result'), __esModule: true, default: {} }));
jest.mock('../models/StudentProfile', () => ({ __esModule: true, default: {} }));
jest.mock('../models/VisaProcess', () => ({ ...jest.requireActual('../models/VisaProcess'), __esModule: true, default: {} }));

const base: JourneyFacts = {
  application: { status: ApplicationStatus.DRAFT, hasInterviewDecision: false, arrived: false },
  courseState: 'none',
  transcriptUploaded: false,
  visaStatus: VisaStatus.NOT_STARTED,
  approvedItems: 0,
  outlinesUploaded: 0,
  resultsPublished: false,
};

const shortlisted: JourneyFacts = {
  ...base,
  application: { status: ApplicationStatus.SHORTLISTED, hasInterviewDecision: true, recommended: true, arrived: false },
};

const approved: JourneyFacts = { ...shortlisted, courseState: 'approved', transcriptUploaded: true };

describe('evaluateJourney', () => {
  it('starts at registration with everything else locked', () => {
    const { steps } = evaluateJourney({ ...base, application: null });

    expect(steps.registration).toBe('current');
    JOURNEY_STEPS.slice(1).forEach((key) => expect(steps[key]).toBe('locked'));
  });

  it('never marks a later step done while an earlier one is open', () => {
    // Transcript uploaded and visa approved, but the student has not even submitted the registration.
    const { steps } = evaluateJourney({ ...base, transcriptUploaded: true, visaStatus: VisaStatus.APPROVED });

    expect(steps.registration).toBe('current');
    expect(steps.documents).toBe('locked');
    expect(steps.visa).toBe('locked');
  });

  it('advances one step at a time as earlier steps finish', () => {
    expect(evaluateJourney(shortlisted).steps['course-selection']).toBe('current');
    expect(evaluateJourney({ ...shortlisted, courseState: 'in_review' }).steps['course-approval']).toBe('current');
    expect(evaluateJourney(approved).steps.visa).toBe('current');
    expect(evaluateJourney({ ...approved, visaStatus: VisaStatus.APPROVED }).steps.arrival).toBe('current');
  });

  it('keeps earlier steps done after arrival even though an outline upload reopens the request', () => {
    const arrived: JourneyFacts = {
      ...approved,
      courseState: 'in_review',
      visaStatus: VisaStatus.APPROVED,
      application: { ...approved.application!, arrived: true },
      approvedItems: 2,
      outlinesUploaded: 1,
    };

    const { steps } = evaluateJourney(arrived);

    expect(steps['course-approval']).toBe('done');
    expect(steps.arrival).toBe('done');
    expect(steps.outline).toBe('current');
    expect(steps.results).toBe('locked');
  });

  it('stops the journey when the advisor does not recommend the student', () => {
    const gate = evaluateJourney({
      ...base,
      application: { status: ApplicationStatus.REJECTED, hasInterviewDecision: true, recommended: false, arrived: false },
      transcriptUploaded: true,
    });

    expect(gate.stoppedReason).toMatch(/did not recommend/);
    expect(gate.steps.shortlisting).toBe('stopped');
    expect(gate.steps['course-selection']).toBe('locked');
    expect(gate.steps.visa).toBe('locked');
    expect(gate.steps.results).toBe('locked');
  });

  it('stops the journey on a rejected visa and locks everything after it', () => {
    const gate = evaluateJourney({ ...approved, visaStatus: VisaStatus.REJECTED });

    expect(gate.stoppedReason).toMatch(/visa was rejected/);
    expect(gate.steps['course-approval']).toBe('done');
    expect(gate.steps.visa).toBe('stopped');
    expect(gate.steps.arrival).toBe('locked');
    expect(gate.steps.outline).toBe('locked');
  });

  it('treats a rejected course request as resubmittable, not as a stopped application', () => {
    const gate = evaluateJourney({ ...shortlisted, courseState: 'rejected' });

    expect(gate.stoppedReason).toBeNull();
    expect(gate.steps['course-selection']).toBe('current');
  });
});

describe('canActOnStep', () => {
  it('allows a step only when every earlier step is done', () => {
    const gate = evaluateJourney({ ...approved, visaStatus: VisaStatus.APPROVED });

    expect(canActOnStep(gate, 'visa')).toBe(true);
    expect(canActOnStep(gate, 'arrival')).toBe(true);
    expect(canActOnStep(gate, 'outline')).toBe(false);
    expect(canActOnStep(gate, 'results')).toBe(false);
  });

  it('blocks every later step once the application has stopped', () => {
    const gate = evaluateJourney({ ...approved, visaStatus: VisaStatus.REJECTED });

    expect(canActOnStep(gate, 'arrival')).toBe(false);
    expect(canActOnStep(gate, 'results')).toBe(false);
  });
});
