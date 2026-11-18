import { useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, PlaneLanding } from 'lucide-react';
import { Link } from 'react-router-dom';
import Notice from '../../components/Notice';
import LockedStepNotice from '../../components/student/LockedStepNotice';
import { useStudentJourney } from '../../hooks/useStudentJourney';
import { applicationApi } from '../../lib/applicationApi';
import { parseApiError } from '../../lib/errorUtils';
import { buildStudentJourney } from '../../utils/studentJourney';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

const NEXT_STEPS = [
  'You tell your advisor you have arrived.',
  'Your advisor confirms it and records your arrival date.',
  'Your instructors at the host university are told about your online classes at home.',
  'You upload the course outline you received for each course, on the Courses page.',
];

/** Where the student tells their advisor they have reached the host country, and sees the confirmation. */
export default function StudentArrival() {
  const [journey, setJourney] = useStudentJourney();
  const [reporting, setReporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!journey) {
    return <div className="glass-card h-48 animate-pulse rounded-[2rem]" />;
  }

  const steps = buildStudentJourney(journey);
  const step = steps.find((item) => item.key === 'arrival');
  const application = journey.application;

  // Not open yet: name the step that comes first.
  if (!application || !step || step.state === 'locked') {
    const missing = steps.find((item) => item.state !== 'done');
    return (
      <LockedStepNotice
        title="Arrival is not open yet"
        message={
          missing
            ? `Finish "${missing.title}" first. ${missing.description}`
            : 'It opens once the steps before it are complete.'
        }
        actionLabel={missing ? `Go to ${missing.title}` : undefined}
        actionTo={missing?.to}
      />
    );
  }

  const arrivedAt = application.arrival?.arrivedAt;
  const reportedAt = application.arrivalReport?.reportedAt;
  const notices = application.arrival?.notices ?? [];

  const handleReport = async () => {
    setReporting(true);
    setErrorMessage('');
    try {
      const { reportedAt: reported } = await applicationApi.reportArrival(application._id);
      setJourney({ ...journey, application: { ...application, arrivalReport: { reportedAt: reported } } });
    } catch (error) {
      const parsed = parseApiError(error);
      setErrorMessage([parsed.message, parsed.solution].filter(Boolean).join(' '));
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}

      <section className="glass-card space-y-4 rounded-[2rem] p-6 md:p-8">
        {arrivedAt ? (
          <>
            <div className="flex items-center gap-3 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
              <p className="text-lg font-bold">Your arrival is confirmed</p>
            </div>
            <p className="text-sm text-slate-600">
              Your advisor recorded your arrival on {formatDate(arrivedAt)}.
              {notices.length
                ? ` ${notices.filter((notice) => notice.sent).length} of ${notices.length} instructor email${
                    notices.length === 1 ? '' : 's'
                  } sent.`
                : ''}
            </p>
            <Link to="/dashboard/courses" className="inline-flex items-center gap-2 text-sm font-bold text-dark-blue">
              Upload your course outlines
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        ) : reportedAt ? (
          <>
            <div className="flex items-center gap-3 text-amber-700">
              <Clock className="h-6 w-6" />
              <p className="text-lg font-bold">Waiting for your advisor to confirm</p>
            </div>
            <p className="text-sm text-slate-600">
              You told your advisor on {formatDate(reportedAt)} that you arrived. You will be notified once they confirm
              it.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 text-dark-blue">
              <PlaneLanding className="h-6 w-6" />
              <p className="text-lg font-bold">Reached the host country?</p>
            </div>
            <p className="text-sm text-slate-600">Let your advisor know so they can confirm your arrival.</p>
            <button
              type="button"
              onClick={() => void handleReport()}
              disabled={reporting}
              className="inline-flex items-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0e1550] disabled:opacity-60"
            >
              {reporting ? 'Sending...' : 'I have arrived'}
            </button>
          </>
        )}
      </section>

      <section className="glass-card rounded-[2rem] p-6 md:p-8">
        <h2 className="text-base font-bold text-slate-900">What happens next</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
          {NEXT_STEPS.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
