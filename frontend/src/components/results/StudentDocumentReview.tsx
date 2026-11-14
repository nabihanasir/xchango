import { useState } from 'react';
import { CheckCircle2, FileDown, LoaderCircle, Undo2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { verificationApi } from '../../lib/api';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type { ExamVerification } from '../../types/result';
import { formatDisplayDate, getVerificationClasses, verificationLabels } from '../../utils/result';
import Notice from '../Notice';

interface Props {
  /** The document the student uploaded, or null when nothing has been uploaded yet. */
  verification: ExamVerification | null;
  /** Called after a review so the parent can reload its data. */
  onReviewed: () => void;
}

/** One student's verification document: the file, their note, and verify / return actions. */
export default function StudentDocumentReview({ verification, onReviewed }: Props) {
  const { user } = useAuth();
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const review = async (action: 'verify' | 'return') => {
    if (!user?.token || !verification) {
      return;
    }
    try {
      setBusy(true);
      setError('');
      await verificationApi.reviewVerification(user.token, verification._id, { action, reason });
      setReturning(false);
      setReason('');
      onReviewed();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to save the review.');
    } finally {
      setBusy(false);
    }
  };

  if (!verification) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-4">
        <p className="text-sm font-bold text-slate-800">No verification document yet</p>
        <p className="mt-1 text-sm text-slate-600">
          Grading opens as soon as the student uploads the document they bring back from the host university.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${getVerificationClasses(verification.status)}`}>
          {verificationLabels[verification.status]}
        </span>
        <a
          href={resolveUploadUrl(verification.fileUrl)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900"
        >
          <FileDown className="h-4 w-4" />
          {verification.fileName}
        </a>
        <span className="text-xs font-semibold text-slate-500">
          {verification.country} · uploaded {formatDisplayDate(verification.submittedAt)}
        </span>
      </div>
      {verification.note ? <p className="text-sm text-slate-600">Student note: {verification.note}</p> : null}
      {verification.status === 'returned' && verification.returnReason ? (
        <p className="text-sm font-medium text-red-700">
          Returned: {verification.returnReason}. Grading stays closed until the student uploads a corrected document.
        </p>
      ) : null}

      {verification.status === 'submitted' ? (
        returning ? (
          <div className="space-y-3">
            <textarea
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is it being returned? (the student sees this)"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
            />
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void review('return')}
                className="inline-flex items-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
                Send back
              </button>
              <button
                type="button"
                onClick={() => setReturning(false)}
                className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700"
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
              onClick={() => void review('verify')}
              className="inline-flex items-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Mark as verified
            </button>
            <button
              type="button"
              onClick={() => setReturning(true)}
              className="inline-flex items-center rounded-full bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Return to student
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
