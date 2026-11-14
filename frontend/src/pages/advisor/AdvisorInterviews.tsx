import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarCheck, CalendarClock, ChevronDown, Clock, GraduationCap, ThumbsDown, ThumbsUp, UserCheck } from 'lucide-react';
import { applicationApi } from '../../lib/applicationApi';
import InlineMessage from '../../components/interview/InlineMessage';
import Modal from '../../components/Modal';
import CancelInterviewModal from '../../components/interview/CancelInterviewModal';
import {
  formatSlotDay,
  formatSlotFull,
  formatSlotTime,
  groupDaysByWeek,
  groupSlotsByDay,
} from '../../components/interview/interviewTime';
import {
  getApplicationUserSummary,
  type InterviewSlot,
  type WorkflowApplication,
} from '../../types/application';

const studentName = (application: WorkflowApplication) =>
  getApplicationUserSummary(application.studentId)?.name ?? 'Student';

/* ------------------------------------------------------------------ Cards */

function InterviewCard({
  application,
  badge,
  children,
  extra,
}: {
  application: WorkflowApplication;
  badge?: ReactNode;
  children?: ReactNode;
  extra?: ReactNode;
}) {
  const request = application.interviewRequest;
  const hasTime = request && ['requested', 'accepted'].includes(request.status);
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dark-blue/10 font-bold text-dark-blue">
            {studentName(application).charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-slate-900">{studentName(application)}</p>
              {badge}
            </div>
            <p className="text-sm text-slate-500">
              {application.program} · {application.university}
            </p>
            {hasTime ? (
              <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-800">
                <Clock className="h-4 w-4" />
                {formatSlotFull(request.start, request.durationMinutes)} · {request.durationMinutes} min
              </p>
            ) : null}
          </div>
        </div>
        {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
      </div>
      {extra}
    </li>
  );
}

function Section({
  icon,
  title,
  hint,
  count,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{icon}</span>
        <div>
          <h2 className="font-bold text-slate-900">
            {title} <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold">{count}</span>
          </h2>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const Empty = ({ text }: { text: string }) => (
  <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">{text}</p>
);

/* ------------------------------------------------------------------ Recommendation popup */

/** Shown when an interview is marked as done: the advisor says whether the student is recommended. */
function RecommendationModal({
  application,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  application: WorkflowApplication;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (recommended: boolean, notes: string) => void;
}) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const needsNote = choice === false;

  return (
    <Modal onClose={onClose} locked={busy} labelledBy="recommend-title">
      <div className="space-y-5 overflow-y-auto p-6">
        <div>
          <h2 id="recommend-title" className="text-xl font-bold text-slate-900">
            Interview finished — recommend {studentName(application)}?
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            The student is told your decision. A recommended student can continue to course selection.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setChoice(true)}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-sm font-bold ${
              choice === true ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-700'
            }`}
          >
            <ThumbsUp className="h-6 w-6" />
            Recommend
          </button>
          <button
            type="button"
            onClick={() => setChoice(false)}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-sm font-bold ${
              choice === false ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-700'
            }`}
          >
            <ThumbsDown className="h-6 w-6" />
            Don’t recommend
          </button>
        </div>

        {choice !== null ? (
          <div>
            <label className="text-sm font-bold text-slate-800">
              {needsNote ? 'Reason (required — the student will see this)' : 'Feedback (optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </div>
        ) : null}

        {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            Decide later
          </button>
          <button
            type="button"
            disabled={busy || choice === null || (needsNote && !notes.trim())}
            onClick={() => onSubmit(choice as boolean, notes.trim())}
            className="rounded-xl bg-dark-blue px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Save decision'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ Availability (compact) */

/** "08:00–09:30" style ranges for runs of consecutive blocked slots. */
const blockedRanges = (slots: InterviewSlot[]) => {
  const ranges: string[] = [];
  let runStart = '';
  let runEnd = '';
  const flush = () => {
    if (runStart) ranges.push(`${formatSlotTime(runStart)}–${formatSlotTime(runEnd)}`);
    runStart = '';
  };
  for (const slot of slots) {
    const slotEnd = new Date(new Date(slot.start).getTime() + 30 * 60000).toISOString();
    if (slot.state !== 'unavailable') {
      flush();
    } else if (runStart && new Date(runEnd).getTime() === new Date(slot.start).getTime()) {
      runEnd = slotEnd;
    } else {
      flush();
      runStart = slot.start;
      runEnd = slotEnd;
    }
  }
  flush();
  return ranges;
};

function Availability() {
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [weekIndex, setWeekIndex] = useState(0);
  const [openDay, setOpenDay] = useState('');

  useEffect(() => {
    applicationApi
      .getAdvisorAvailability()
      .then((data) => setSlots(data.slots))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load availability.'))
      .finally(() => setLoading(false));
  }, []);

  const weeks = useMemo(() => groupDaysByWeek(groupSlotsByDay(slots)), [slots]);
  const week = weeks[Math.min(weekIndex, Math.max(weeks.length - 1, 0))];

  const update = async (starts: string[], unavailable: boolean) => {
    if (starts.length === 0) return;
    setSaving(true);
    setError('');
    try {
      setSlots((await applicationApi.setAdvisorAvailability(starts, unavailable)).slots);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save availability.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
      <div>
        <h2 className="font-bold text-slate-900">My availability</h2>
        <p className="mt-1 text-xs text-slate-500">
          Students can book any free slot, weekdays 8:00–17:00 (Pakistan time). Tell them when you’re <strong>not</strong>{' '}
          free — they won’t be able to pick those times.
        </p>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : !week ? (
        <InlineMessage tone="info">No slots to show right now.</InlineMessage>
      ) : (
        <>
          <div className="flex gap-2">
            {weeks.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setWeekIndex(index)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold ${
                  item.key === week.key ? 'bg-dark-blue text-white' : 'border border-slate-300 text-slate-700'
                }`}
              >
                {index === 0 ? 'This week' : index === 1 ? 'Next week' : 'Later'}
              </button>
            ))}
          </div>

          {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

          <ul className="divide-y divide-slate-100">
            {week.days.map((day) => {
              const editable = day.slots.filter((slot) => ['available', 'unavailable'].includes(slot.state));
              const dayOff = editable.length > 0 && editable.every((slot) => slot.state === 'unavailable');
              const ranges = blockedRanges(day.slots);
              const busyCount = day.slots.filter((slot) => ['held', 'booked'].includes(slot.state)).length;
              const open = openDay === day.key;
              return (
                <li key={day.key} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{formatSlotDay(day.slots[0].start)}</p>
                      <p className={`text-xs ${dayOff ? 'font-semibold text-rose-600' : ranges.length ? 'text-rose-600' : 'text-slate-500'}`}>
                        {dayOff ? 'Day off' : ranges.length ? `Unavailable ${ranges.join(', ')}` : 'Free all day'}
                        {busyCount ? ` · ${busyCount * 30} min in interviews` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        disabled={saving || editable.length === 0}
                        onClick={() => void update(editable.map((slot) => slot.start), !dayOff)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-700 disabled:opacity-40"
                      >
                        {dayOff ? 'Undo day off' : 'Day off'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenDay(open ? '' : day.key)}
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700"
                        aria-expanded={open}
                      >
                        Times
                        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {open ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-slate-500">Tap a time to mark it unavailable (red). Tap again to free it.</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {day.slots.map((slot) => {
                          const locked = slot.state === 'held' || slot.state === 'booked';
                          const style =
                            slot.state === 'unavailable'
                              ? 'border-rose-300 bg-rose-100 text-rose-700 line-through'
                              : slot.state === 'held'
                                ? 'border-amber-300 bg-amber-100 text-amber-800'
                                : slot.state === 'booked'
                                  ? 'border-indigo-300 bg-indigo-100 text-indigo-800'
                                  : 'border-slate-300 bg-white text-slate-700 hover:border-dark-blue';
                          return (
                            <button
                              key={slot.start}
                              type="button"
                              disabled={saving || locked}
                              title={
                                slot.state === 'held'
                                  ? 'A student requested this time'
                                  : slot.state === 'booked'
                                    ? 'Confirmed interview'
                                    : undefined
                              }
                              onClick={() => void update([slot.start], slot.state === 'available')}
                              className={`rounded-md border py-1.5 text-xs font-semibold ${style} ${locked ? 'cursor-not-allowed' : ''}`}
                            >
                              {formatSlotTime(slot.start)}
                            </button>
                          );
                        })}
                      </div>
                      <p className="flex flex-wrap gap-x-3 text-[11px] text-slate-500">
                        <span>▢ free</span>
                        <span className="text-rose-600">▣ unavailable</span>
                        <span className="text-amber-700">▣ requested</span>
                        <span className="text-indigo-700">▣ confirmed</span>
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ Page */

export default function AdvisorInterviews() {
  const [applications, setApplications] = useState<WorkflowApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [cancelTarget, setCancelTarget] = useState<WorkflowApplication | null>(null);
  const [declineTarget, setDeclineTarget] = useState<WorkflowApplication | null>(null);
  const [declineNote, setDeclineNote] = useState('');
  const [recommendTarget, setRecommendTarget] = useState<WorkflowApplication | null>(null);

  const load = useCallback(async () => {
    try {
      setApplications(await applicationApi.getAdvisorApplications());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load interviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (application: WorkflowApplication, action: () => Promise<unknown>, after?: () => void) => {
    setBusyId(application._id);
    setError('');
    try {
      await action();
      setCancelTarget(null);
      setDeclineTarget(null);
      setDeclineNote('');
      after?.();
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Something went wrong.');
      await load();
    } finally {
      setBusyId('');
    }
  };

  /** Marks the interview done (if it isn't already) and records the recommendation. */
  const saveDecision = (application: WorkflowApplication, recommended: boolean, notes: string) =>
    act(
      application,
      async () => {
        if (application.status === 'INTERVIEW_SCHEDULED') {
          await applicationApi.completeInterview(application._id);
        }
        await applicationApi.recordInterviewDecision(application._id, { recommended, notes });
      },
      () => setRecommendTarget(null)
    );

  const byStart = (a: WorkflowApplication, b: WorkflowApplication) =>
    new Date(a.interviewRequest?.start ?? 0).getTime() - new Date(b.interviewRequest?.start ?? 0).getTime();
  const requested = applications.filter((item) => item.interviewRequest?.status === 'requested').sort(byStart);
  const confirmed = applications
    .filter((item) => item.status === 'INTERVIEW_SCHEDULED' && item.interviewRequest?.status === 'accepted')
    .sort(byStart);
  const awaitingDecision = applications.filter((item) => item.status === 'INTERVIEW_COMPLETED');
  const decided = applications
    .filter((item) => item.interviewDecision)
    .sort(
      (a, b) =>
        new Date(b.interviewDecision?.decidedAt ?? 0).getTime() - new Date(a.interviewDecision?.decidedAt ?? 0).getTime()
    );
  const waiting = applications.filter(
    (item) => item.status === 'ASSIGNED' && item.interviewRequest?.status !== 'requested'
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-500">Advisor</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Interviews</h1>
        <p className="mt-1 text-sm text-slate-600">
          Answer booking requests, run your interviews, and set when you’re unavailable.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-9">
          {error && !cancelTarget && !recommendTarget ? <InlineMessage tone="error">{error}</InlineMessage> : null}

          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ) : (
            <>
              <Section
                icon={<CalendarClock className="h-5 w-5" />}
                title="Needs your answer"
                hint="A student picked one of your free slots."
                count={requested.length}
              >
                {requested.length === 0 ? (
                  <Empty text="No requests waiting." />
                ) : (
                  <ul className="space-y-3">
                    {requested.map((application) => (
                      <InterviewCard
                        key={application._id}
                        application={application}
                        badge={<span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">Pending</span>}
                      >
                        <button
                          type="button"
                          disabled={busyId === application._id}
                          onClick={() =>
                            void act(application, () => applicationApi.respondToInterviewRequest(application._id, { accept: true }))
                          }
                          className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={busyId === application._id}
                          onClick={() => setDeclineTarget(application)}
                          className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-bold text-slate-700"
                        >
                          Decline
                        </button>
                      </InterviewCard>
                    ))}
                  </ul>
                )}
              </Section>

              <Section
                icon={<CalendarCheck className="h-5 w-5" />}
                title="Upcoming interviews"
                hint="Mark an interview as done to record your recommendation."
                count={confirmed.length}
              >
                {confirmed.length === 0 ? (
                  <Empty text="No confirmed interviews yet." />
                ) : (
                  <ul className="space-y-3">
                    {confirmed.map((application) => (
                      <InterviewCard
                        key={application._id}
                        application={application}
                        badge={<span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">Confirmed</span>}
                      >
                        <button
                          type="button"
                          onClick={() => setRecommendTarget(application)}
                          className="rounded-xl bg-dark-blue px-5 py-2 text-sm font-bold text-white"
                        >
                          Mark as done
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelTarget(application)}
                          className="rounded-xl border border-rose-300 px-5 py-2 text-sm font-bold text-rose-700"
                        >
                          Cancel…
                        </button>
                      </InterviewCard>
                    ))}
                  </ul>
                )}
              </Section>

              {awaitingDecision.length > 0 ? (
                <Section
                  icon={<UserCheck className="h-5 w-5" />}
                  title="Decision needed"
                  hint="These interviews are done but you haven’t said whether to recommend the student."
                  count={awaitingDecision.length}
                >
                  <ul className="space-y-3">
                    {awaitingDecision.map((application) => (
                      <InterviewCard
                        key={application._id}
                        application={application}
                        badge={<span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">Awaiting decision</span>}
                      >
                        <button
                          type="button"
                          onClick={() => setRecommendTarget(application)}
                          className="rounded-xl bg-dark-blue px-5 py-2 text-sm font-bold text-white"
                        >
                          Record decision
                        </button>
                      </InterviewCard>
                    ))}
                  </ul>
                </Section>
              ) : null}

              <Section
                icon={<ThumbsUp className="h-5 w-5" />}
                title="Completed & decided"
                hint="Interviews you’ve finished and your recommendation."
                count={decided.length}
              >
                {decided.length === 0 ? (
                  <Empty text="No decisions recorded yet." />
                ) : (
                  <ul className="space-y-3">
                    {decided.map((application) => {
                      const decision = application.interviewDecision!;
                      return (
                        <InterviewCard
                          key={application._id}
                          application={application}
                          badge={
                            decision.recommended ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                                <ThumbsUp className="h-3 w-3" /> Recommended
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                                <ThumbsDown className="h-3 w-3" /> Not recommended
                              </span>
                            )
                          }
                          extra={
                            decision.notes ? (
                              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{decision.notes}</p>
                            ) : null
                          }
                        />
                      );
                    })}
                  </ul>
                )}
              </Section>

              <Section
                icon={<GraduationCap className="h-5 w-5" />}
                title="Haven't booked yet"
                hint="Assigned students who still need to pick a time."
                count={waiting.length}
              >
                {waiting.length === 0 ? (
                  <Empty text="Everyone assigned to you has booked." />
                ) : (
                  <ul className="space-y-3">
                    {waiting.map((application) => (
                      <InterviewCard key={application._id} application={application} />
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </div>

        <Availability />
      </div>

      {recommendTarget ? (
        <RecommendationModal
          application={recommendTarget}
          busy={busyId === recommendTarget._id}
          error={error}
          onClose={() => setRecommendTarget(null)}
          onSubmit={(recommended, notes) => void saveDecision(recommendTarget, recommended, notes)}
        />
      ) : null}

      {cancelTarget?.interviewRequest ? (
        <CancelInterviewModal
          when={formatSlotFull(cancelTarget.interviewRequest.start, cancelTarget.interviewRequest.durationMinutes)}
          busy={busyId === cancelTarget._id}
          error={error}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason, details) =>
            void act(cancelTarget, () => applicationApi.cancelInterviewRequest(cancelTarget._id, { reason, details }))
          }
        />
      ) : null}

      {declineTarget ? (
        <Modal onClose={() => setDeclineTarget(null)} locked={busyId === declineTarget._id}>
          <div className="space-y-4 p-6">
            <h2 className="text-xl font-bold text-slate-900">Decline this request?</h2>
            <p className="text-sm text-slate-600">
              {studentName(declineTarget)} will be told and asked to choose another time.
            </p>
            <textarea
              value={declineNote}
              onChange={(event) => setDeclineNote(event.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Optional note, e.g. “Please pick an afternoon slot”"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeclineTarget(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busyId === declineTarget._id}
                onClick={() =>
                  void act(declineTarget, () =>
                    applicationApi.respondToInterviewRequest(declineTarget._id, {
                      accept: false,
                      note: declineNote.trim(),
                    })
                  )
                }
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Decline request
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
