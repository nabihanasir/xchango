import type { WorkflowApplication } from '../types/application';
import type { CourseRequest } from '../types/equivalency';
import { buildAdvisorOverview } from './advisorOverview';

const NOW = new Date('2026-11-15T09:00:00Z');
const inDays = (days: number) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

const app = (overrides: Record<string, unknown> = {}) =>
  ({
    _id: 'a1',
    studentId: { _id: 's1', name: 'Nabiha Nasir', email: 'n@x.com' },
    status: 'ASSIGNED',
    university: 'MMU',
    country: 'Malaysia',
    updatedAt: inDays(-1),
    ...overrides,
  }) as unknown as WorkflowApplication;

const request = (overrides: Record<string, unknown> = {}) =>
  ({
    _id: 'r1',
    studentId: { _id: 's1', name: 'Nabiha Nasir' },
    status: 'pending',
    courseCount: 1,
    updatedAt: inDays(-2),
    ...overrides,
  }) as unknown as CourseRequest;

describe('buildAdvisorOverview', () => {
  it('is empty when the advisor has nothing', () => {
    expect(buildAdvisorOverview([], [], NOW)).toEqual({
      students: 0,
      interviewsThisWeek: 0,
      openRequests: 0,
      abroad: 0,
      upcomingInterviews: [],
      recentActivity: [],
    });
  });

  it('counts each student once, open requests and students abroad', () => {
    const overview = buildAdvisorOverview(
      [
        app({ _id: 'a1' }),
        app({ _id: 'a2', status: 'SHORTLISTED', arrival: { arrivedAt: inDays(-3) } }),
        app({ _id: 'a3', studentId: { _id: 's2', name: 'Hadia' }, status: 'COMPLETED', arrival: { arrivedAt: inDays(-90) } }),
      ],
      [request({ status: 'pending' }), request({ _id: 'r2', status: 'under_review' }), request({ _id: 'r3', status: 'approved' })],
      NOW
    );
    expect(overview).toMatchObject({ students: 2, openRequests: 2, abroad: 1 });
  });

  it('lists upcoming interviews soonest first, skips past ones and marks unanswered requests', () => {
    const overview = buildAdvisorOverview(
      [
        app({ _id: 'late', status: 'INTERVIEW_SCHEDULED', interview: { date: inDays(10), location: 'Online' } }),
        app({ _id: 'past', status: 'INTERVIEW_SCHEDULED', interview: { date: inDays(-1), location: 'Office' } }),
        app({ _id: 'soon', status: 'INTERVIEW_SCHEDULED', interviewDate: inDays(2) }),
        app({ _id: 'asked', interviewRequest: { status: 'requested', start: inDays(1) } }),
        app({ _id: 'declined', interviewRequest: { status: 'declined', start: inDays(1) } }),
      ],
      [],
      NOW
    );
    expect(overview.upcomingInterviews.map((item) => [item.key, item.awaitingAnswer])).toEqual([
      ['asked', true],
      ['soon', false],
      ['late', false],
    ]);
    expect(overview.interviewsThisWeek).toBe(2);
  });

  it('mixes applications and course requests into recent activity, newest first, capped at five', () => {
    const overview = buildAdvisorOverview(
      [app({ _id: 'a1', updatedAt: inDays(-5) }), app({ _id: 'a2', updatedAt: inDays(-4) }), app({ _id: 'a3', updatedAt: inDays(-3) })],
      [request({ _id: 'r1', updatedAt: inDays(-1) }), request({ _id: 'r2', updatedAt: inDays(-2), courseCount: 3 }), request({ _id: 'r3', updatedAt: inDays(-6) })],
      NOW
    );
    expect(overview.recentActivity.map((entry) => entry.key)).toEqual([
      'request-r1',
      'request-r2',
      'application-a3',
      'application-a2',
      'application-a1',
    ]);
    expect(overview.recentActivity[0]).toMatchObject({ badge: 'To review', to: '/advisor/requests/r1', text: 'Course request · 1 course' });
    expect(overview.recentActivity[1].text).toBe('Course request · 3 courses');
  });
});
