import type { WorkflowApplication } from '../types/application';
import type { CourseRequest } from '../types/equivalency';
import { buildStudentJourney, type JourneyInput } from './studentJourney';

const app = (overrides: Partial<WorkflowApplication> = {}) =>
  ({ _id: 'app1', status: 'SUBMITTED', createdAt: '2026-01-01', ...overrides }) as WorkflowApplication;

const request = (status: string, items: Array<Record<string, unknown>> = []) =>
  ({ _id: 'r1', status, items, outlineUploadOpen: false }) as unknown as CourseRequest;

const base: JourneyInput = { application: null, requests: [], documents: [], visa: null, results: [] };

const states = (input: Partial<JourneyInput>) =>
  Object.fromEntries(buildStudentJourney({ ...base, ...input }).map((step) => [step.key, step.state]));

describe('buildStudentJourney', () => {
  it('starts at registration for a student with no application', () => {
    const steps = buildStudentJourney(base);
    expect(steps).toHaveLength(10);
    expect(steps[0]).toMatchObject({ key: 'registration', state: 'current', actionLabel: 'Start registration' });
    expect(steps.slice(1).every((step) => step.state === 'locked')).toBe(true);
  });

  it('waits at the interview after the registration is submitted', () => {
    const result = states({ application: app({ status: 'ASSIGNED' }) });
    expect(result.registration).toBe('done');
    expect(result.interview).toBe('current');
  });

  it('stops at shortlisting when the advisor did not recommend the student', () => {
    const result = states({
      application: app({
        status: 'REJECTED',
        interviewDecision: { recommended: false, notes: 'x', decidedAt: '2026-02-01' },
      }),
    });
    expect(result.interview).toBe('done');
    expect(result.shortlisting).toBe('stopped');
    expect(result['course-selection']).toBe('locked');
  });

  it('moves from course selection to approval to documents', () => {
    const shortlisted = app({ status: 'SHORTLISTED', interviewDecision: { recommended: true, notes: '', decidedAt: '' } });
    expect(states({ application: shortlisted })['course-selection']).toBe('current');
    expect(states({ application: shortlisted, requests: [request('pending')] })['course-approval']).toBe('current');
    expect(states({ application: shortlisted, requests: [request('approved')] }).documents).toBe('current');
  });

  it('keeps arrival as a waiting step until it is recorded, then opens outline upload', () => {
    const shortlisted = app({ status: 'SHORTLISTED', interviewDecision: { recommended: true, notes: '', decidedAt: '' } });
    const requests = [request('approved', [{ status: 'approved' }, { status: 'approved', uploadedOutline: { text: 'x' } }])];
    const documents = ['transcript', 'cv', 'passport'].map((type) => ({ type })) as never;
    const visa = { status: 'approved' } as never;

    const waiting = states({ application: shortlisted, requests, documents, visa });
    expect(waiting.visa).toBe('done');
    expect(waiting.arrival).toBe('current');
    expect(waiting.outline).toBe('locked');

    const arrived = buildStudentJourney({
      application: app({ ...shortlisted, arrival: { arrivedAt: '2026-03-01' } as never }),
      requests,
      documents,
      visa,
      results: [],
    });
    const outline = arrived.find((step) => step.key === 'outline');
    expect(outline).toMatchObject({ state: 'current', actionLabel: 'Upload outlines' });
    expect(outline?.description).toContain('1 of 2');
  });

  it('offers an arrival report button once, then waits for the advisor', () => {
    const shortlisted = app({ status: 'SHORTLISTED', interviewDecision: { recommended: true, notes: '', decidedAt: '' } });
    const documents = ['transcript', 'cv', 'passport'].map((type) => ({ type })) as never;
    const input = { ...base, requests: [request('approved')], documents, visa: { status: 'approved' } as never };

    const before = buildStudentJourney({ ...input, application: shortlisted }).find((step) => step.key === 'arrival');
    expect(before).toMatchObject({ state: 'current', actionLabel: 'I have arrived', actionKind: 'report-arrival' });

    const reported = buildStudentJourney({
      ...input,
      application: app({ ...shortlisted, arrivalReport: { reportedAt: '2026-03-01' } }),
    }).find((step) => step.key === 'arrival');
    expect(reported?.actionLabel).toBeUndefined();
    expect(reported?.description).toContain('Waiting for them to confirm');
  });

  it('flags a rejected visa as stopped', () => {
    const shortlisted = app({ status: 'SHORTLISTED', interviewDecision: { recommended: true, notes: '', decidedAt: '' } });
    const documents = ['transcript', 'cv', 'passport'].map((type) => ({ type })) as never;
    expect(states({ application: shortlisted, requests: [request('approved')], documents, visa: { status: 'rejected' } as never }).visa).toBe(
      'stopped'
    );
  });
});
