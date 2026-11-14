import { getApplicationStatusLabel, getApplicationStatusTone, getApplicationUserSummary } from '../types/application';
import type { WorkflowApplication } from '../types/application';
import type { CourseRequest } from '../types/equivalency';

export interface UpcomingInterview {
  key: string;
  studentName: string;
  /** ISO time of the interview, or of the slot the student asked for. */
  when: string;
  location?: string;
  /** The student picked a slot and is waiting for the advisor to accept or decline. */
  awaitingAnswer: boolean;
}

export interface ActivityEntry {
  key: string;
  studentName: string;
  text: string;
  badge: string;
  badgeClasses: string;
  at: string;
  to: string;
}

export interface AdvisorOverview {
  students: number;
  interviewsThisWeek: number;
  openRequests: number;
  abroad: number;
  upcomingInterviews: UpcomingInterview[];
  recentActivity: ActivityEntry[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_UPCOMING = 4;
const MAX_ACTIVITY = 5;

const studentNameOf = (application: WorkflowApplication) => getApplicationUserSummary(application.studentId)?.name || 'Student';
const studentKeyOf = (application: WorkflowApplication) =>
  typeof application.studentId === 'string' ? application.studentId : application.studentId?._id;

const REQUEST_BADGES: Record<CourseRequest['status'], { label: string; classes: string }> = {
  pending: { label: 'To review', classes: 'bg-amber-100 text-amber-700' },
  under_review: { label: 'To review', classes: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', classes: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-700' },
};

const toTime = (value?: string) => (value ? new Date(value).getTime() : Number.NaN);

/** What the advisor's dashboard shows besides the task cards: workload numbers, interviews coming up and recent changes. */
export const buildAdvisorOverview = (
  applications: WorkflowApplication[],
  requests: CourseRequest[],
  now: Date = new Date()
): AdvisorOverview => {
  const nowMs = now.getTime();

  const interviews: UpcomingInterview[] = [];
  for (const application of applications) {
    const scheduledAt = application.interview?.date ?? application.interviewDate;
    if (application.status === 'INTERVIEW_SCHEDULED' && scheduledAt && toTime(scheduledAt) >= nowMs) {
      interviews.push({
        key: application._id,
        studentName: studentNameOf(application),
        when: scheduledAt,
        location: application.interview?.location,
        awaitingAnswer: false,
      });
    } else if (application.interviewRequest?.status === 'requested' && toTime(application.interviewRequest.start) >= nowMs) {
      interviews.push({
        key: application._id,
        studentName: studentNameOf(application),
        when: application.interviewRequest.start,
        awaitingAnswer: true,
      });
    }
  }
  interviews.sort((left, right) => toTime(left.when) - toTime(right.when));

  const activity: Array<ActivityEntry & { time: number }> = [
    ...applications.map((application) => ({
      key: `application-${application._id}`,
      studentName: studentNameOf(application),
      text: `${application.university}, ${application.country}`,
      badge: getApplicationStatusLabel(application),
      badgeClasses: getApplicationStatusTone(application),
      at: application.updatedAt,
      to: '/advisor/applications',
      time: toTime(application.updatedAt),
    })),
    ...requests.map((request) => {
      const badge = REQUEST_BADGES[request.status];
      return {
        key: `request-${request._id}`,
        studentName: request.studentId?.name || 'Student',
        text: `Course request · ${request.courseCount} course${request.courseCount === 1 ? '' : 's'}`,
        badge: badge.label,
        badgeClasses: badge.classes,
        at: request.updatedAt,
        to: `/advisor/requests/${request._id}`,
        time: toTime(request.updatedAt),
      };
    }),
  ]
    .filter((entry) => !Number.isNaN(entry.time))
    .sort((left, right) => right.time - left.time)
    .slice(0, MAX_ACTIVITY);

  return {
    students: new Set(applications.map(studentKeyOf).filter(Boolean)).size,
    interviewsThisWeek: interviews.filter((interview) => toTime(interview.when) < nowMs + 7 * DAY_MS).length,
    openRequests: requests.filter((request) => ['pending', 'under_review'].includes(request.status)).length,
    abroad: applications.filter((application) => application.arrival?.arrivedAt && application.status !== 'COMPLETED').length,
    upcomingInterviews: interviews.slice(0, MAX_UPCOMING),
    recentActivity: activity.map(({ time, ...entry }) => {
      void time;
      return entry;
    }),
  };
};
