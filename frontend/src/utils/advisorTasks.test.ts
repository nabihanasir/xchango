import type { WorkflowApplication } from '../types/application';
import type { CourseRequest } from '../types/equivalency';
import type { ExamVerification, GradableItem } from '../types/result';
import { buildAdvisorTasks, pickNextAdvisorTask, type AdvisorTaskInput } from './advisorTasks';

const app = (overrides: Record<string, unknown> = {}) =>
  ({ _id: 'a', status: 'ASSIGNED', ...overrides }) as unknown as WorkflowApplication;

const empty: AdvisorTaskInput = { applications: [], requests: [], gradable: [], verifications: [] };
const keys = (input: Partial<AdvisorTaskInput>) => buildAdvisorTasks({ ...empty, ...input }).map((task) => task.key);

describe('buildAdvisorTasks', () => {
  it('has nothing to show when nothing is waiting', () => {
    expect(buildAdvisorTasks(empty)).toEqual([]);
  });

  it('puts interview answers and decisions before everything else', () => {
    const result = keys({
      applications: [app({ status: 'INTERVIEW_COMPLETED' }), app({ interviewRequest: { status: 'requested' } })],
      requests: [{ status: 'pending' } as unknown as CourseRequest],
      gradable: [{ result: null } as unknown as GradableItem],
    });
    expect(result).toEqual(['interview-requests', 'interview-decisions', 'course-requests', 'grading']);
  });

  it('counts only open course requests and unpublished results', () => {
    const tasks = buildAdvisorTasks({
      ...empty,
      requests: [{ status: 'approved' }, { status: 'under_review' }, { status: 'pending' }] as unknown as CourseRequest[],
      gradable: [
        { result: { status: 'published' } },
        { result: { status: 'draft' } },
        { result: null },
      ] as unknown as GradableItem[],
      verifications: [{ status: 'verified' }, { status: 'submitted' }] as unknown as ExamVerification[],
    });
    expect(Object.fromEntries(tasks.map((task) => [task.key, task.count]))).toEqual({
      'course-requests': 2,
      verifications: 1,
      grading: 2,
    });
  });

  it('asks to confirm an arrival only while it is unconfirmed', () => {
    expect(
      keys({
        applications: [
          app({ arrivalReport: { reportedAt: 'x' } }),
          app({ arrivalReport: { reportedAt: 'x' }, arrival: { arrivedAt: 'y' } }),
        ],
      })
    ).toEqual(['arrivals']);
  });
});

describe('pickNextAdvisorTask', () => {
  const tasks = buildAdvisorTasks({
    ...empty,
    applications: [app({ interviewRequest: { status: 'requested' } })],
    requests: [{ status: 'pending' } as unknown as CourseRequest],
    gradable: [{ result: null } as unknown as GradableItem],
  });

  it('suggests the top task elsewhere and counts the rest', () => {
    const { next, others } = pickNextAdvisorTask(tasks, '/advisor');
    expect(next?.key).toBe('interview-requests');
    expect(others).toBe(2);
  });

  it('skips the task for the page the advisor is already on', () => {
    expect(pickNextAdvisorTask(tasks, '/advisor/interviews').next?.key).toBe('course-requests');
    expect(pickNextAdvisorTask(tasks, '/advisor/requests/abc123').next?.key).toBe('interview-requests');
  });

  it('shows nothing when every pending task belongs to this page', () => {
    const onlyGrading = tasks.filter((task) => task.key === 'grading');
    expect(pickNextAdvisorTask(onlyGrading, '/advisor/results').next).toBeNull();
  });
});
