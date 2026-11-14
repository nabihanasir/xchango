import type { WorkflowApplication } from '../types/application';
import type { CourseRequest } from '../types/equivalency';
import type { ExamVerification, GradableItem } from '../types/result';

export interface AdvisorTask {
  key: 'interview-requests' | 'interview-decisions' | 'course-requests' | 'arrivals' | 'verifications' | 'grading';
  /** Short headline, e.g. "3 interview requests need an answer". */
  title: string;
  description: string;
  actionLabel: string;
  /** Advisor page where the task is done. */
  to: string;
  count: number;
}

export interface AdvisorTaskInput {
  applications: WorkflowApplication[];
  requests: CourseRequest[];
  gradable: GradableItem[];
  verifications: ExamVerification[];
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/**
 * What an advisor has waiting, most urgent first: students are held up by interview answers and
 * decisions before anything else, then course approval, arrivals and results.
 */
export const buildAdvisorTasks = ({ applications, requests, gradable, verifications }: AdvisorTaskInput): AdvisorTask[] => {
  const interviewRequests = applications.filter((item) => item.interviewRequest?.status === 'requested').length;
  const decisions = applications.filter((item) => item.status === 'INTERVIEW_COMPLETED').length;
  const courseRequests = requests.filter((item) => ['pending', 'under_review'].includes(item.status)).length;
  const arrivals = applications.filter((item) => item.arrivalReport && !item.arrival).length;
  const toVerify = verifications.filter((item) => item.status === 'submitted').length;
  const toGrade = gradable.filter((item) => !item.result || item.result.status === 'draft').length;

  const tasks: Array<AdvisorTask | null> = [
    interviewRequests
      ? {
          key: 'interview-requests',
          title: `${plural(interviewRequests, 'interview request')} need${interviewRequests === 1 ? 's' : ''} an answer`,
          description: 'Students picked a time from your free slots. Accept or decline.',
          actionLabel: 'Answer requests',
          to: '/advisor/interviews',
          count: interviewRequests,
        }
      : null,
    decisions
      ? {
          key: 'interview-decisions',
          title: `${plural(decisions, 'student')} waiting for your recommendation`,
          description: 'Their interview is done. Say whether you recommend them.',
          actionLabel: 'Record decisions',
          to: '/advisor/interviews',
          count: decisions,
        }
      : null,
    courseRequests
      ? {
          key: 'course-requests',
          title: `${plural(courseRequests, 'course request')} to review`,
          description: 'Students are waiting for you to approve or reject their host courses.',
          actionLabel: 'Review course requests',
          to: '/advisor/requests',
          count: courseRequests,
        }
      : null,
    arrivals
      ? {
          key: 'arrivals',
          title: `${plural(arrivals, 'student')} reported arriving`,
          description: 'Confirm their arrival so they can upload course outlines.',
          actionLabel: 'Confirm arrivals',
          to: '/advisor/applications',
          count: arrivals,
        }
      : null,
    toVerify
      ? {
          key: 'verifications',
          title: `${plural(toVerify, 'exam document')} to verify`,
          description: 'Students submitted proof of their exam results.',
          actionLabel: 'Verify documents',
          to: '/advisor/results',
          count: toVerify,
        }
      : null,
    toGrade
      ? {
          key: 'grading',
          title: `${plural(toGrade, 'course')} without a published result`,
          description: 'Enter and publish grades for your students’ courses.',
          actionLabel: 'Enter results',
          to: '/advisor/results',
          count: toGrade,
        }
      : null,
  ];

  return tasks.filter((task): task is AdvisorTask => task !== null);
};

/** The task to show on the page the advisor is on: the first one that is not about this page. */
export const pickNextAdvisorTask = (tasks: AdvisorTask[], pathname: string) => {
  const here = pathname.replace(/\/+$/, '') || '/';
  const onPage = (to: string) => here === to || here.startsWith(`${to}/`);
  const remaining = tasks.filter((task) => !onPage(task.to));
  return { next: remaining[0] ?? null, others: Math.max(remaining.length - 1, 0) };
};
