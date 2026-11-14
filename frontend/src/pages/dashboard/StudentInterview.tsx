import { useState } from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import InterviewDecisionBanner from '../../components/InterviewDecisionBanner';
import InterviewScheduler from '../../components/interview/InterviewScheduler';
import { formatSlotFull } from '../../components/interview/interviewTime';
import { useStudentJourney } from '../../hooks/useStudentJourney';
import { buildStudentJourney } from '../../utils/studentJourney';

/** Where the student books the interview with their advisor and later reads the outcome. */
export default function StudentInterview() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [journey] = useStudentJourney(refreshKey);

  if (!journey) {
    return <div className="glass-card h-48 animate-pulse rounded-[2rem]" />;
  }

  const application = journey.application;
  const step = buildStudentJourney(journey).find((item) => item.key === 'interview');
  const canBook = Boolean(application?.advisorId) && ['ASSIGNED', 'INTERVIEW_SCHEDULED'].includes(application?.status ?? '');

  // Not open yet: say why and where to go.
  if (!application || step?.state === 'locked') {
    return (
      <div className="glass-card flex items-start gap-4 rounded-[2rem] p-6 md:p-8">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Lock className="h-5 w-5" />
        </span>
        <div className="space-y-3">
          <p className="text-lg font-bold text-slate-900">The interview is not open yet</p>
          <p className="text-sm text-slate-600">{step?.description ?? 'Available once you submit your registration.'}</p>
          <Link to="/dashboard/applications" className="inline-flex items-center gap-2 text-sm font-bold text-dark-blue">
            Go to Registration
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const when =
    application.interviewRequest?.status === 'accepted'
      ? formatSlotFull(application.interviewRequest.start, application.interviewRequest.durationMinutes)
      : null;

  return (
    <div className="space-y-5">
      {canBook ? (
        <section className="glass-card rounded-[2rem] p-6 md:p-8">
          <p className="text-sm font-bold text-slate-900">
            {application.university} · {application.program}
          </p>
          <div className="mt-4">
            <InterviewScheduler application={application} onChanged={() => setRefreshKey((key) => key + 1)} />
          </div>
        </section>
      ) : (
        <section className="glass-card space-y-3 rounded-[2rem] p-6 md:p-8">
          <p className="text-sm font-bold text-slate-900">{step?.description}</p>
          {when ? <p className="text-sm text-slate-600">Your interview was booked for {when}.</p> : null}
        </section>
      )}
      <InterviewDecisionBanner application={application} />
    </div>
  );
}
