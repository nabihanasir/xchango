import { useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, Check, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { applicationApi } from '../../lib/applicationApi';
import InterviewDecisionBanner from '../../components/InterviewDecisionBanner';
import {
  getApplicationStatusLabel,
  getApplicationStatusTone,
  recommendedApplicationStatuses,
  type WorkflowApplication,
} from '../../types/application';

const workflowStages = [
  { label: 'Profile', statuses: [] as string[] },
  { label: 'Application', statuses: ['PENDING'] },
  { label: 'Advisor Assigned', statuses: ['ASSIGNED'] },
  { label: 'Interview', statuses: ['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'REJECTED'] },
  { label: 'Recommended', statuses: recommendedApplicationStatuses as string[] },
];

// Index of the furthest stage the application has reached (Profile is always reached).
const getCurrentStageIndex = (status: string) =>
  workflowStages.reduce((current, stage, index) => (stage.statuses.includes(status) ? index : current), 0);

function StageTracker({ status }: { status: string }) {
  const currentIndex = getCurrentStageIndex(status);
  const lastIndex = workflowStages.length - 1;

  return (
    <ol className="mt-6 flex w-full max-w-2xl">
      {workflowStages.map((stage, index) => {
        // The final stage counts as complete once reached; earlier stages complete when passed.
        const complete = index < currentIndex || (index === currentIndex && index === lastIndex) || index === 0;
        const current = index === currentIndex && !complete;

        return (
          <li key={stage.label} className="relative flex flex-1 flex-col items-center text-center">
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${
                  index <= currentIndex ? 'bg-dark-blue' : 'bg-slate-200'
                }`}
              />
            ) : null}
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                complete
                  ? 'border-dark-blue bg-dark-blue text-white'
                  : current
                    ? 'border-dark-blue bg-white ring-4 ring-dark-blue/15'
                    : 'border-slate-300 bg-white'
              }`}
            >
              {complete ? (
                <Check className="h-4 w-4" strokeWidth={3} />
              ) : current ? (
                <span className="h-2.5 w-2.5 rounded-full bg-dark-blue" />
              ) : null}
            </span>
            <span
              className={`mt-2 px-1 text-xs font-bold uppercase tracking-wide ${
                complete || current ? 'text-dark-blue' : 'text-slate-500'
              }`}
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function StudentApplicationsPage() {
  const { user } = useAuth();
  const studentId = user?._id ?? '';

  const [applications, setApplications] = useState<WorkflowApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadApplications = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const data = await applicationApi.getStudentApplications(studentId);
        if (!cancelled) {
          setApplications(data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load applications.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadApplications();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return <div className="glass-card h-48 rounded-[2rem] animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2.5rem] bg-gradient-to-br from-[#060424] via-[#0c174f] to-[#17387b] p-8 text-white shadow-2xl shadow-dark-blue/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-accent-yellow">Application Workflow</p>
            <h1 className="mt-3 text-4xl font-bold">University Applications</h1>
            <p className="mt-3 max-w-2xl text-slate-200">
              Start a new mobility application, continue drafts, and monitor workflow states after submission.
            </p>
          </div>

          <Link
            to="/dashboard/applications/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-accent-yellow px-5 py-4 text-sm font-bold text-dark-blue"
          >
            <PlusCircle className="h-4 w-4" />
            New Application
          </Link>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-5">
        {applications.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-8 text-sm text-slate-500 shadow-sm">
            No applications yet. Create one to start the workflow.
          </div>
        ) : null}

        {applications.map((application) => (
          <article key={application._id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-600">{application.country}</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">{application.program}</h2>
                <p className="mt-1 text-sm text-slate-500">{application.university}</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                  <CalendarClock className="h-4 w-4" />
                  Created {new Date(application.createdAt).toLocaleDateString()}
                </div>
                <StageTracker status={application.status} />
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <div className={`rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] ${getApplicationStatusTone(application)}`}>
                  {getApplicationStatusLabel(application)}
                </div>
                <Link
                  to={`/dashboard/applications/${application._id}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-dark-blue px-4 py-3 text-sm font-bold text-dark-blue"
                >
                  Open Workflow
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="mt-5 empty:hidden">
              <InterviewDecisionBanner application={application} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
