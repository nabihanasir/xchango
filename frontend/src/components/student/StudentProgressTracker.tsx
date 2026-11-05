import { useEffect, useState } from 'react';
import { ArrowRight, Check, Lock, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { applicationApi } from '../../lib/applicationApi';
import { equivalencyApi, resultsApi, visaApi } from '../../lib/api';
import { documentApi } from '../../lib/documentApi';
import { parseApiError } from '../../lib/errorUtils';
import Notice from '../Notice';
import {
  buildStudentJourney,
  pickJourneyApplication,
  type JourneyInput,
  type JourneyStep,
  type JourneyStepState,
} from '../../utils/studentJourney';

const circleClasses: Record<JourneyStepState, string> = {
  done: 'border-slate-300 bg-slate-300 text-white',
  current: 'border-dark-blue bg-white text-dark-blue shadow-[0_0_0_4px_rgba(251,210,19,0.35)]',
  locked: 'border-slate-200 bg-white text-slate-400',
  stopped: 'border-red-500 bg-red-500 text-white',
};

const titleClasses: Record<JourneyStepState, string> = {
  done: 'text-slate-400',
  current: 'text-slate-900',
  locked: 'text-slate-400',
  stopped: 'text-red-600',
};

const NodeIcon = ({ state, index }: { state: JourneyStepState; index: number }) => {
  if (state === 'done') return <Check className="h-4 w-4" />;
  if (state === 'locked') return <Lock className="h-3.5 w-3.5" />;
  if (state === 'stopped') return <X className="h-4 w-4" />;
  return <span className="text-xs font-bold">{index + 1}</span>;
};

export default function StudentProgressTracker() {
  const { user } = useAuth();
  const [journey, setJourney] = useState<JourneyInput | null>(null);
  const [reporting, setReporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleReportArrival = async () => {
    const applicationId = journey?.application?._id;
    if (!journey || !applicationId) {
      return;
    }

    setReporting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { reportedAt } = await applicationApi.reportArrival(applicationId);
      setJourney({ ...journey, application: { ...journey.application!, arrivalReport: { reportedAt } } });
      setSuccessMessage('Your advisor has been told you arrived. They will confirm it shortly.');
    } catch (error) {
      const parsed = parseApiError(error);
      setErrorMessage([parsed.message, parsed.solution].filter(Boolean).join(' '));
    } finally {
      setReporting(false);
    }
  };

  useEffect(() => {
    if (!user?._id || !user.token) {
      return;
    }

    let cancelled = false;
    const { _id: studentId, token } = user;

    // Each source is optional: a failed request just leaves that step unfinished.
    Promise.all([
      applicationApi.getStudentApplications(studentId).catch(() => []),
      equivalencyApi.getStudentRequests(token).catch(() => []),
      documentApi.getStudentDocuments(studentId).catch(() => []),
      visaApi.getStudentVisa(token).catch(() => null),
      resultsApi.getStudentResults(token).catch(() => []),
    ]).then(([applications, requests, documents, visa, results]) => {
      if (!cancelled) {
        setJourney({ application: pickJourneyApplication(applications), requests, documents, visa, results });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?._id, user?.token]);

  if (!journey) {
    return <div className="glass-card h-44 animate-pulse rounded-[2rem]" />;
  }

  const steps = buildStudentJourney(journey);
  const focus: JourneyStep | undefined = steps.find((step) => step.state === 'current' || step.state === 'stopped');
  const completed = steps.filter((step) => step.state === 'done').length;

  return (
    <section className="glass-card rounded-[2rem] p-6 md:p-8" aria-label="Your progress">
      <div className="flex items-end justify-between gap-4">
        <h3 className="flex items-center gap-3 text-2xl font-bold text-dark-blue">
          <span className="inline-block h-7 w-1.5 rounded-full bg-accent-yellow" />
          Your progress
        </h3>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {completed} of {steps.length} complete
        </p>
      </div>

      <ol className="mt-8 xl:grid xl:grid-cols-10">
        {steps.map((step, index) => {
          const clickable = step.state !== 'locked';
          const body = (
            <>
              <span
                className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${circleClasses[step.state]}`}
              >
                <NodeIcon state={step.state} index={index} />
              </span>
              <span
                className={`text-sm font-bold xl:mt-3 xl:px-1 xl:text-center xl:text-xs xl:leading-tight ${titleClasses[step.state]}`}
              >
                {step.title}
              </span>
            </>
          );

          return (
            <li key={step.key} className="relative pb-5 last:pb-0 xl:pb-0">
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-[15px] top-8 h-full w-0.5 xl:left-1/2 xl:top-4 xl:h-0.5 xl:w-full ${
                    step.state === 'done' ? 'bg-slate-300' : 'bg-slate-200'
                  }`}
                />
              ) : null}
              {clickable ? (
                <Link
                  to={step.to}
                  className="flex items-center gap-4 xl:flex-col xl:gap-0"
                  aria-current={step.state === 'current' ? 'step' : undefined}
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-4 xl:flex-col xl:gap-0">{body}</div>
              )}
            </li>
          );
        })}
      </ol>

      {focus ? (
        <div
          className={`mt-8 flex flex-col gap-4 rounded-[1.5rem] border p-5 md:flex-row md:items-center md:justify-between ${
            focus.state === 'stopped' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {focus.state === 'stopped' ? 'Needs attention' : 'Next step'}
            </p>
            <p className="mt-1 text-base font-bold text-slate-900">{focus.title}</p>
            <p className="mt-1 text-sm text-slate-600">{focus.description}</p>
          </div>
          {focus.actionLabel && focus.actionKind === 'report-arrival' ? (
            <button
              type="button"
              onClick={() => void handleReportArrival()}
              disabled={reporting}
              className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0e1550] disabled:opacity-60"
            >
              {reporting ? 'Sending...' : focus.actionLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : focus.actionLabel ? (
            <Link
              to={focus.to}
              className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0e1550]"
            >
              {focus.actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
          Every step is complete.
        </p>
      )}

      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      {successMessage ? <Notice tone="success">{successMessage}</Notice> : null}
    </section>
  );
}
