import { Check, LoaderCircle, Stamp } from 'lucide-react';
import { useEffect, useState } from 'react';
import VisaStatusBadge from '../../components/visa/VisaStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { visaApi } from '../../lib/api';
import type { StudentVisaProcess } from '../../types/visa';
import { formatVisaDate, getReachedStageIndex, VISA_STAGES, VISA_STATUS_META } from '../../utils/visa';

type StepState = 'done' | 'current' | 'stopped' | 'upcoming';

const STEP_CIRCLE: Record<StepState, string> = {
  done: 'bg-dark-blue text-accent-yellow',
  current: 'bg-accent-yellow text-dark-blue ring-4 ring-accent-yellow/30',
  stopped: 'bg-red-500 text-white ring-4 ring-red-500/20',
  upcoming: 'bg-slate-100 text-slate-400',
};

export default function StudentVisa() {
  const { user } = useAuth();
  const [visa, setVisa] = useState<StudentVisaProcess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadVisa = async () => {
      if (!user?.token) {
        setIsLoading(false);
        return;
      }

      try {
        setError('');
        setVisa(await visaApi.getStudentVisa(user.token));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your visa status.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadVisa();
  }, [user?.token]);

  const status = visa?.status ?? 'not_started';
  const reachedIndex = getReachedStageIndex(visa);
  const isRejected = status === 'rejected';
  const history = visa ? [...visa.history].reverse() : [];

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-[2.5rem] p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent-yellow">Visa Process</p>
        <h1 className="mt-3 text-3xl font-black text-slate-800 md:text-4xl">Your visa status</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">
          Follow your visa application from document collection to approval. The International Office updates this
          page as your case moves forward.
        </p>
      </section>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="glass-card rounded-[2rem] p-8 text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          <section className="glass-card rounded-[2.25rem] p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Current status</p>
                <div className="mt-3">
                  <VisaStatusBadge status={status} />
                </div>
                <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-slate-600">
                  {VISA_STATUS_META[status].description}
                </p>
              </div>
              {visa ? (
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Updated {formatVisaDate(visa.updatedAt)}
                </p>
              ) : null}
            </div>

            {visa?.remarks ? (
              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                  Note from the International Office
                </p>
                <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-slate-700">{visa.remarks}</p>
              </div>
            ) : null}
          </section>

          <section className="glass-card rounded-[2.25rem] p-6 md:p-8" aria-label="Visa progress">
            <h2 className="text-lg font-black text-slate-800">Progress</h2>
            <ol className="mt-6 grid gap-5 md:grid-cols-6 md:gap-3">
              {VISA_STAGES.map((stage, index) => {
                const state: StepState =
                  index < reachedIndex
                    ? 'done'
                    : index === reachedIndex
                      ? stage === 'approved'
                        ? 'done'
                        : isRejected
                          ? 'stopped'
                          : 'current'
                      : 'upcoming';

                return (
                  <li
                    key={stage}
                    aria-current={state === 'current' ? 'step' : undefined}
                    className="flex items-center gap-4 md:flex-col md:items-center md:gap-3 md:text-center"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black transition ${STEP_CIRCLE[state]}`}
                    >
                      {state === 'done' ? <Check className="h-5 w-5" strokeWidth={3} /> : index + 1}
                    </span>
                    <span
                      className={`text-sm font-bold leading-5 ${state === 'upcoming' ? 'text-slate-400' : 'text-slate-800'}`}
                    >
                      {VISA_STATUS_META[stage].label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          {history.length ? (
            <section className="glass-card rounded-[2.25rem] p-6 md:p-8">
              <h2 className="text-lg font-black text-slate-800">Update history</h2>
              <ul className="mt-6 space-y-5">
                {history.map((entry) => (
                  <li key={entry._id} className="flex gap-4">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent-yellow" />
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <VisaStatusBadge status={entry.status} />
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                          {formatVisaDate(entry.updatedAt)}
                        </span>
                      </div>
                      {entry.remarks ? (
                        <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-slate-600">
                          {entry.remarks}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="glass-card rounded-[2rem] px-6 py-12 text-center">
              <Stamp className="mx-auto h-8 w-8 text-slate-400" />
              <h2 className="mt-4 text-2xl font-black text-slate-800">Nothing to report yet</h2>
              <p className="mt-3 text-sm font-medium text-slate-500">
                Once the International Office begins your visa process, each update will appear here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
