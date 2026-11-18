import { useState } from 'react';
import LockedStepNotice from '../../components/student/LockedStepNotice';
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
      <LockedStepNotice
        title="The interview is not open yet"
        message={step?.description ?? 'Available once you submit your registration.'}
        actionLabel="Go to Registration"
        actionTo="/dashboard/applications"
      />
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
