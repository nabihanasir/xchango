import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import CountryHeroCarousel from '../../components/CountryHeroCarousel';
import { useAdvisorDashboard } from '../../hooks/useAdvisorDashboard';
import type { ActivityEntry, UpcomingInterview } from '../../utils/advisorOverview';
import type { AdvisorTask } from '../../utils/advisorTasks';

const TASK_STYLES: Record<AdvisorTask['key'], { edge: string; count: string }> = {
  'interview-requests': { edge: 'border-l-red-500', count: 'bg-red-100 text-red-700' },
  'interview-decisions': { edge: 'border-l-amber-500', count: 'bg-amber-100 text-amber-700' },
  'course-requests': { edge: 'border-l-sky-500', count: 'bg-sky-100 text-sky-700' },
  arrivals: { edge: 'border-l-emerald-500', count: 'bg-emerald-100 text-emerald-700' },
  verifications: { edge: 'border-l-violet-500', count: 'bg-violet-100 text-violet-700' },
  grading: { edge: 'border-l-violet-500', count: 'bg-violet-100 text-violet-700' },
};

const formatDay = (iso: string) => {
  const date = new Date(iso);
  return { day: String(date.getDate()), month: date.toLocaleDateString(undefined, { month: 'short' }) };
};

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const StatTile = ({ label, value, hint }: { label: string; value: number; hint: string }) => (
  <div className="glass-card rounded-[1.5rem] border border-slate-200 px-5 py-4">
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
    <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    <p className="text-sm text-slate-500">{hint}</p>
  </div>
);

const SectionTitle = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    {hint ? <span className="text-sm font-semibold text-slate-500">{hint}</span> : null}
  </div>
);

function InterviewRow({ interview }: { interview: UpcomingInterview }) {
  const { day, month } = formatDay(interview.when);
  return (
    <li className="flex items-center gap-4 border-t border-slate-100 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="w-14 shrink-0 rounded-2xl bg-teal-50 py-1.5 text-center leading-tight text-teal-700">
        <b className="block text-xl">{day}</b>
        <span className="text-[11px] font-bold uppercase tracking-wider">{month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-900">{interview.studentName}</p>
        <p className="truncate text-sm text-slate-500">
          {formatTime(interview.when)}
          {interview.location ? ` · ${interview.location}` : ''}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
          interview.awaitingAnswer ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
        }`}
      >
        {interview.awaitingAnswer ? 'Awaiting your answer' : 'Scheduled'}
      </span>
    </li>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  return (
    <li className="border-t border-slate-100 first:border-t-0">
      <Link to={entry.to} className="flex items-center gap-4 py-4 transition hover:bg-slate-50/70 first:pt-0 last:pb-0">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-slate-900">{entry.studentName}</p>
          <p className="mt-0.5 truncate text-sm text-slate-500">{entry.text}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${entry.badgeClasses}`}>{entry.badge}</span>
      </Link>
    </li>
  );
}

export default function AdvisorDashboard() {
  const dashboard = useAdvisorDashboard();

  return (
    <div className="space-y-8">
      <CountryHeroCarousel
        title="Review assigned applications"
        description="AI suggests course matches and reasons, but the final approval or rejection remains with the advisor."
        scrimClass="bg-advisor-side/60"
        minHeightClass="min-h-[200px]"
        showTicker={false}
      />

      {!dashboard ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-40 animate-pulse rounded-[1.5rem] bg-slate-100" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="h-24 animate-pulse rounded-[1.5rem] bg-slate-100" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <section>
            <SectionTitle
              title="Needs your attention"
              hint={dashboard.tasks.length ? `${dashboard.tasks.length} thing${dashboard.tasks.length === 1 ? '' : 's'} waiting, most urgent first` : undefined}
            />
            {dashboard.tasks.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dashboard.tasks.map((task) => {
                  const style = TASK_STYLES[task.key];
                  return (
                    <article key={task.key} className={`glass-card flex flex-col gap-3 rounded-[1.5rem] border border-l-4 border-slate-200 p-5 ${style.edge}`}>
                      <div className="flex items-center gap-3">
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ${style.count}`}>{task.count}</span>
                        <h3 className="text-base font-bold leading-snug text-slate-900">{task.title}</h3>
                      </div>
                      <p className="flex-1 text-sm text-slate-600">{task.description}</p>
                      <Link to={task.to} className="inline-flex items-center gap-2 self-start text-sm font-bold text-teal-700 transition hover:text-teal-900">
                        {task.actionLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-[1.5rem] bg-emerald-50 px-5 py-4 font-bold text-emerald-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                You are all caught up. Nothing is waiting for you right now.
              </div>
            )}
          </section>

          <section>
            <SectionTitle title="Your workload" hint="Across all your students" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile label="Students" value={dashboard.overview.students} hint="assigned to you" />
              <StatTile label="Interviews" value={dashboard.overview.interviewsThisWeek} hint="in the next 7 days" />
              <StatTile label="Course requests" value={dashboard.overview.openRequests} hint="waiting for review" />
              <StatTile label="Abroad now" value={dashboard.overview.abroad} hint="students on exchange" />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="glass-card rounded-[1.75rem] border border-slate-200 p-6">
              <SectionTitle title="Upcoming interviews" />
              {dashboard.overview.upcomingInterviews.length ? (
                <ul>
                  {dashboard.overview.upcomingInterviews.map((interview) => (
                    <InterviewRow key={interview.key} interview={interview} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-medium text-slate-500">No interviews are scheduled or requested.</p>
              )}
              <Link to="/advisor/interviews" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-teal-700 transition hover:text-teal-900">
                All interviews
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            <section className="glass-card rounded-[1.75rem] border border-slate-200 p-6">
              <SectionTitle title="Recent activity" />
              {dashboard.overview.recentActivity.length ? (
                <ul>
                  {dashboard.overview.recentActivity.slice(0, 4).map((entry) => (
                    <ActivityRow key={entry.key} entry={entry} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-medium text-slate-500">Nothing has changed yet.</p>
              )}
              <Link to="/advisor/applications" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-teal-700 transition hover:text-teal-900">
                All applications
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
