import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileDown, LoaderCircle, Undo2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { verificationApi } from '../../lib/api';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type { ExamVerification, StudentSummary } from '../../types/result';
import { formatDisplayDate, getVerificationClasses, verificationLabels } from '../../utils/result';
import Notice from '../Notice';

interface Props {
  /** Called after a review so the grading list below can refresh its verification badges. */
  onReviewed?: () => void;
}

const studentOf = (verification: ExamVerification) =>
  typeof verification.studentId === 'string' ? null : (verification.studentId as StudentSummary);

export default function AdvisorVerificationPanel({ onReviewed }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<ExamVerification[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [returningId, setReturningId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.token) {
      setIsLoading(false);
      return;
    }
    try {
      setItems(await verificationApi.getAdvisorVerifications(user.token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load verification documents.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id: string, action: 'verify' | 'return') => {
    if (!user?.token) {
      return;
    }
    try {
      setBusyId(id);
      setError('');
      await verificationApi.reviewVerification(user.token, id, { action, reason: reasons[id] });
      setReturningId('');
      await load();
      onReviewed?.();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to save the review.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="glass-card rounded-[2.25rem] p-6 md:p-8">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <h2 className="text-xl font-bold text-slate-800">Verification documents</h2>
      <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
        Documents students bring back from their host university, for the countries you supervise. Verify a document,
        then assign the grades in the courses below, or return it with a reason.
      </p>

      {isLoading ? (
        <LoaderCircle className="mt-4 h-5 w-5 animate-spin text-slate-500" />
      ) : items.length ? (
        <div className="mt-5 space-y-4">
          {items.map((item) => {
            const student = studentOf(item);
            const busy = busyId === item._id;
            return (
              <article key={item._id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${getVerificationClasses(
                      item.status
                    )}`}
                  >
                    {verificationLabels[item.status]}
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {student ? `${student.name} · ${student.email}` : 'Student'}
                    {student?.sapId ? ` · SAP ${student.sapId}` : ''}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    {item.country} · {formatDisplayDate(item.submittedAt)}
                  </span>
                </div>

                <a
                  href={resolveUploadUrl(item.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-dark-blue"
                >
                  <FileDown className="h-4 w-4" />
                  {item.fileName}
                </a>
                {item.note ? <p className="mt-2 text-sm font-medium text-slate-600">Student note: {item.note}</p> : null}
                {item.status === 'returned' && item.returnReason ? (
                  <p className="mt-2 text-sm font-medium text-red-700">Returned: {item.returnReason}</p>
                ) : null}

                {item.status === 'submitted' ? (
                  <div className="mt-4">
                    {returningId === item._id ? (
                      <div className="space-y-3">
                        <textarea
                          rows={2}
                          value={reasons[item._id] || ''}
                          onChange={(event) => setReasons((current) => ({ ...current, [item._id]: event.target.value }))}
                          placeholder="Why is it being returned? (the student sees this)"
                          className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
                        />
                        <div className="flex gap-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void review(item._id, 'return')}
                            className="inline-flex items-center rounded-[1.25rem] bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                          >
                            {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
                            Send back
                          </button>
                          <button
                            type="button"
                            onClick={() => setReturningId('')}
                            className="rounded-[1.25rem] bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void review(item._id, 'verify')}
                          className="inline-flex items-center rounded-[1.25rem] bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                        >
                          {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Mark as verified
                        </button>
                        <button
                          type="button"
                          onClick={() => setReturningId(item._id)}
                          className="inline-flex items-center rounded-[1.25rem] bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                        >
                          <Undo2 className="mr-2 h-4 w-4" />
                          Return to student
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm font-medium text-slate-500">No documents have been uploaded yet.</p>
      )}
    </section>
  );
}
