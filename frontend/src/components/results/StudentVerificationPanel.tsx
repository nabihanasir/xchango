import { useCallback, useEffect, useState } from 'react';
import { FileDown, LoaderCircle, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { verificationApi } from '../../lib/api';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type { StudentVerificationState } from '../../types/result';
import { formatDisplayDate, getVerificationClasses, verificationLabels } from '../../utils/result';
import Notice from '../Notice';

export default function StudentVerificationPanel() {
  const { user } = useAuth();
  const [state, setState] = useState<StudentVerificationState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!user?.token) {
      setIsLoading(false);
      return;
    }
    try {
      setState(await verificationApi.getStudentVerification(user.token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your verification document.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (!user?.token || !file) {
      setError('Choose your verification document first.');
      return;
    }
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      await verificationApi.submitStudentVerification(user.token, file, note.trim());
      setFile(null);
      setNote('');
      setSuccess('Your document was sent to your advisor for review.');
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to upload the document.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-[2rem] p-8 text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const verification = state?.verification ?? null;
  const canUpload = Boolean(state?.application) && verification?.status !== 'verified';

  return (
    <section className="glass-card rounded-[2.25rem] p-6 md:p-8">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {success ? <Notice tone="success">{success}</Notice> : null}

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-slate-800">Host university verification document</h2>
        <span
          className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.25em] ${getVerificationClasses(
            verification?.status ?? 'none'
          )}`}
        >
          {verificationLabels[verification?.status ?? 'none']}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
        When you are back home, upload the official document from your host university (for example the transcript or
        result letter). Your advisor reviews it and then assigns your grades.
        {state?.application ? ` Exchange: ${state.application.university}, ${state.application.country}.` : ''}
      </p>

      {!state?.application ? (
        <p className="mt-4 text-sm font-medium text-slate-500">
          You need a submitted exchange application before you can upload a document.
        </p>
      ) : null}

      {verification ? (
        <div className="mt-4 space-y-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600">
          <a
            href={resolveUploadUrl(verification.fileUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 font-bold text-dark-blue"
          >
            <FileDown className="h-4 w-4" />
            {verification.fileName}
          </a>
          <p>Uploaded {formatDisplayDate(verification.submittedAt)}</p>
          {verification.status === 'returned' && verification.returnReason ? (
            <p className="font-bold text-red-700">Returned by your advisor: {verification.returnReason}</p>
          ) : null}
        </div>
      ) : null}

      {canUpload ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              {verification ? 'Replace document' : 'Document'} (PDF, JPG, PNG, max 10 MB)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="mt-2 w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-bold"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Note (optional)</label>
            <input
              type="text"
              value={note}
              maxLength={1000}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving || !file}
            className="inline-flex items-center justify-center rounded-[1.25rem] bg-dark-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-navy-hover disabled:opacity-60"
          >
            {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {verification ? 'Resubmit' : 'Submit'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
