import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { applicationApi } from '../../lib/applicationApi';
import CancelInterviewModal from './CancelInterviewModal';
import InlineMessage from './InlineMessage';
import { formatSlotFull, formatSlotTime, groupSlotsByDay, slotPeriod } from './interviewTime';
import type { InterviewSlotsResponse, WorkflowApplication } from '../../types/application';

interface Props {
  application: WorkflowApplication;
  /** Called after any change so the parent can refetch the application. */
  onChanged: () => void;
}

/** Student-facing booking panel: pick a free 30 or 60 minute slot with the assigned advisor. */
export default function InterviewScheduler({ application, onChanged }: Props) {
  const [data, setData] = useState<InterviewSlotsResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [duration, setDuration] = useState<30 | 60>(30);
  const [dayKey, setDayKey] = useState('');
  const [selected, setSelected] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const request = application.interviewRequest;
  const confirmed = application.status === 'INTERVIEW_SCHEDULED' && request?.status === 'accepted';
  const pending = request?.status === 'requested';

  const load = useCallback(async () => {
    try {
      setData(await applicationApi.getInterviewSlots(application._id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load interview slots.');
    }
  }, [application._id]);

  useEffect(() => {
    if (!confirmed) void load();
  }, [load, confirmed, request?.status, request?.start]);

  const days = useMemo(() => groupSlotsByDay(data?.slots ?? []), [data]);
  const activeDay = days.find((day) => day.key === dayKey) ?? days.find((day) => hasRoom(day.slots, duration)) ?? days[0];

  // A 60 minute interview needs this slot and the next one to both be free and back to back.
  const isSelectable = (index: number) => {
    const slots = activeDay?.slots ?? [];
    for (let offset = 0; offset < duration / 30; offset += 1) {
      const slot = slots[index + offset];
      if (!slot || slot.state !== 'available') return false;
      if (offset > 0 && new Date(slot.start).getTime() - new Date(slots[index + offset - 1].start).getTime() !== 30 * 60000) {
        return false;
      }
    }
    return true;
  };

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      setSelected('');
      setShowCancel(false);
      onChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Something went wrong.');
      void load();
    } finally {
      setBusy(false);
    }
  };

  if (confirmed && request) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CalendarCheck className="mt-1 h-6 w-6 text-indigo-700" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Interview confirmed</p>
            <p className="text-lg font-bold text-slate-900">{formatSlotFull(request.start, request.durationMinutes)}</p>
            <p className="text-sm text-slate-600">
              {request.durationMinutes} minutes · {application.interview?.location}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCancel(true)}
          className="rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700"
        >
          Can’t make it? Cancel…
        </button>
        {showCancel ? (
          <CancelInterviewModal
            when={formatSlotFull(request.start, request.durationMinutes)}
            busy={busy}
            error={error}
            onClose={() => setShowCancel(false)}
            onConfirm={(reason, details) =>
              void run(() => applicationApi.cancelInterviewRequest(application._id, { reason, details }))
            }
          />
        ) : null}
      </div>
    );
  }

  const stepTitle = (number: number, text: string) => (
    <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-dark-blue text-xs text-white">{number}</span>
      {text}
    </p>
  );

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div>
        <p className="text-base font-bold text-slate-900">Book your interview</p>
        <p className="text-sm text-slate-500">
          Pick a time that suits you. Times are in Pakistan time (PKT), Monday to Friday, 8:00–17:00.
        </p>
      </div>

      {pending && request ? (
        <InlineMessage tone="info">
          <strong>Request sent:</strong> {formatSlotFull(request.start, request.durationMinutes)}. Waiting for your
          advisor to confirm. You can choose a different time below, or{' '}
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => applicationApi.cancelInterviewRequest(application._id))}
            className="font-bold underline"
          >
            withdraw the request
          </button>
          .
        </InlineMessage>
      ) : null}
      {request?.status === 'declined' ? (
        <InlineMessage tone="error">
          Your advisor couldn’t do {formatSlotFull(request.start, request.durationMinutes)}.
          {request.note ? ` “${request.note}”` : ''} Please choose another time.
        </InlineMessage>
      ) : null}
      {request?.status === 'cancelled' && request.cancelledBy === 'advisor' ? (
        <InlineMessage tone="error">Your advisor had to cancel the previous interview. Please choose a new time.</InlineMessage>
      ) : null}
      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

      <div className="space-y-2">
        {stepTitle(1, 'How long?')}
        <div className="flex gap-2">
          {([30, 60] as const).map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => {
                setDuration(minutes);
                setSelected('');
              }}
              className={`rounded-xl border px-5 py-2.5 text-sm font-bold ${
                duration === minutes ? 'border-dark-blue bg-dark-blue text-white' : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              {minutes} minutes
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <>
          <div className="space-y-2">
            {stepTitle(2, 'Which day?')}
            <div className="flex flex-wrap gap-2">
              {days.map((day) => {
                const free = hasRoom(day.slots, duration);
                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={!free}
                    onClick={() => {
                      setDayKey(day.key);
                      setSelected('');
                    }}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                      activeDay?.key === day.key
                        ? 'border-dark-blue bg-dark-blue text-white'
                        : free
                          ? 'border-slate-300 bg-white text-slate-700 hover:border-dark-blue'
                          : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                    }`}
                  >
                    {day.label}
                    {!free ? <span className="block text-[10px] font-semibold">Full</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {stepTitle(3, 'Which time?')}
            {(['Morning', 'Afternoon'] as const).map((period) => {
              const entries = (activeDay?.slots ?? [])
                .map((slot, index) => ({ slot, index }))
                .filter(({ slot }) => slotPeriod(slot.start) === period);
              if (entries.length === 0) return null;
              return (
                <div key={period}>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{period}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                    {entries.map(({ slot, index }) => {
                      const selectable = isSelectable(index);
                      const unavailable = slot.state !== 'available';
                      const chosen = selected === slot.start;
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          disabled={!selectable || busy}
                          title={
                            unavailable ? 'Not available' : selectable ? undefined : `Not enough free time for ${duration} minutes`
                          }
                          onClick={() => setSelected(slot.start)}
                          className={`rounded-lg border px-2 py-2.5 text-sm font-semibold ${
                            chosen
                              ? 'border-dark-blue bg-dark-blue text-white'
                              : unavailable
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through'
                                : selectable
                                  ? 'border-slate-300 bg-white text-slate-800 hover:border-dark-blue'
                                  : 'cursor-not-allowed border-slate-200 bg-white text-slate-300'
                          }`}
                        >
                          {formatSlotTime(slot.start)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-slate-500">Crossed-out times aren’t available.</p>
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {selected ? (
            <>
              You’re requesting <strong className="text-slate-900">{formatSlotFull(selected, duration)}</strong>
            </>
          ) : (
            'Choose a time above to continue.'
          )}
        </p>
        <button
          type="button"
          disabled={!selected || busy}
          onClick={() =>
            void run(() => applicationApi.requestInterview(application._id, { start: selected, durationMinutes: duration }))
          }
          className="rounded-xl bg-dark-blue px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? 'Sending…' : pending ? 'Change my request' : 'Request this time'}
        </button>
      </div>
    </div>
  );
}

/** True when the day has enough consecutive free slots for the chosen length. */
function hasRoom(slots: { start: string; state: string }[], durationMinutes: number) {
  const needed = durationMinutes / 30;
  return slots.some((_, index) => {
    const run = slots.slice(index, index + needed);
    return (
      run.length === needed &&
      run.every(
        (slot, offset) =>
          slot.state === 'available' &&
          (offset === 0 || new Date(slot.start).getTime() - new Date(run[offset - 1].start).getTime() === 30 * 60000)
      )
    );
  });
}
