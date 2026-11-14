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

  it('counts the transcript on the profile page as the documents step', () => {
    const shortlisted = app({ status: 'SHORTLISTED', interviewDecision: { recommended: true, notes: '', decidedAt: '' } });
    const input = { application: shortlisted, requests: [request('approved')] };

    const missing = buildStudentJourney({ ...base, ...input }).find((step) => step.key === 'documents');
    expect(missing).toMatchObject({ state: 'current', to: '/dashboard/profile', actionLabel: 'Upload transcript' });

    const onProfile = buildStudentJourney({ ...base, ...input, transcriptUploaded: true }).find((step) => step.key === 'documents');
    expect(onProfile?.state).toBe('done');
  });

  it('still accepts a transcript document uploaded before it moved to the profile page', () => {
    const shortlisted = app({ status: 'SHORTLISTED', interviewDecision: { recommended: true, notes: '', decidedAt: '' } });
    const documents = [{ type: 'transcript' }] as never;
    expect(states({ application: shortlisted, requests: [request('approved')], documents }).documents).toBe('done');
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

  describe('strict order', () => {
    const shortlisted = app({ status: 'SHORTLISTED', interviewDecision: { recommended: true, notes: '', decidedAt: '' } });

    it('never shows a later step as done while an earlier one is open', () => {
      // Transcript uploaded and visa approved, but the registration was never submitted.
      const result = states({ application: app({ status: 'DRAFT' }), transcriptUploaded: true, visa: { status: 'approved' } as never });

      expect(result.registration).toBe('current');
      expect(result.documents).toBe('locked');
      expect(result.visa).toBe('locked');
    });

    it('keeps documents locked until the courses are approved, even with a transcript on file', () => {
      const result = states({ application: shortlisted, requests: [request('pending')], transcriptUploaded: true });

      expect(result['course-approval']).toBe('current');
      expect(result.documents).toBe('locked');
    });

    it('keeps course approval done after arrival even though an outline upload reopens the request', () => {
      const result = states({
        application: app({ ...shortlisted, arrival: { arrivedAt: '2026-03-01' } as never }),
        requests: [request('under_review', [{ status: 'approved', uploadedOutline: { text: 'x' } }])],
        transcriptUploaded: true,
        visa: { status: 'approved' } as never,
      });

      expect(result['course-approval']).toBe('done');
      expect(result.arrival).toBe('done');
      expect(result.outline).toBe('done');
      expect(result.results).toBe('current');
    });

    it('locks every step after a not-recommended decision, whatever else is on file', () => {
      const result = states({
        application: app({ status: 'REJECTED', interviewDecision: { recommended: false, notes: 'x', decidedAt: '' } }),
        requests: [request('approved')],
        transcriptUploaded: true,
        visa: { status: 'approved' } as never,
        results: [{ status: 'published' }] as never,
      });

      expect(result.shortlisting).toBe('stopped');
      ['course-selection', 'course-approval', 'documents', 'visa', 'arrival', 'outline', 'results'].forEach((key) =>
        expect(result[key]).toBe('locked')
      );
    });

    it('locks arrival, outline and results after a rejected visa', () => {
      const result = states({
        application: shortlisted,
        requests: [request('approved')],
        transcriptUploaded: true,
        visa: { status: 'rejected' } as never,
        results: [{ status: 'published' }] as never,
      });

      expect(result.documents).toBe('done');
      expect(result.visa).toBe('stopped');
      expect(result.arrival).toBe('locked');
      expect(result.outline).toBe('locked');
      expect(result.results).toBe('locked');
    });
  });
});
