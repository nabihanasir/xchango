import { LoaderCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { visaApi } from '../../lib/api';
import type { AdminVisaRow, VisaStatus } from '../../types/visa';
import { VISA_STATUS_META, VISA_STATUSES } from '../../utils/visa';

const MAX_REMARKS = 1000;

interface VisaUpdateModalProps {
  row: AdminVisaRow;
  onClose: () => void;
  onSaved: () => void;
}

export default function VisaUpdateModal({ row, onClose, onSaved }: VisaUpdateModalProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<VisaStatus>(row.visa?.status ?? 'not_started');
  const [remarks, setRemarks] = useState(row.visa?.remarks ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.token) return;

    setSaving(true);
    setError('');
    try {
      await visaApi.updateVisaStatus(user.token, row.student._id, { status, remarks: remarks.trim() });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update the visa status.');
      setSaving(false);
    }
  };

  // Portalled to <body>: the dashboard shell wraps pages in a transformed element, which would
  // otherwise trap this `fixed` overlay inside the content area instead of covering the viewport.
  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-950/20 sm:p-8"
        aria-labelledby="visa-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent-yellow">Visa process</p>
            <h3 id="visa-modal-title" className="mt-2 text-2xl font-black text-dark-blue">
              {row.student.name}
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {row.application.university} · {row.application.country}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:text-dark-blue"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as VisaStatus)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-dark-blue focus:border-dark-blue focus:outline-none"
            >
              {VISA_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {VISA_STATUS_META[value].label}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs font-medium leading-5 text-slate-500">
              {VISA_STATUS_META[status].description}
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Note for the student <span className="font-medium normal-case tracking-normal">(optional)</span>
            </span>
            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              maxLength={MAX_REMARKS}
              rows={4}
              placeholder="e.g. Please bring your original passport to the appointment on 12 March."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 focus:border-dark-blue focus:outline-none"
            />
            <span className="mt-1 block text-right text-[11px] font-medium text-slate-400">
              {remarks.length}/{MAX_REMARKS}
            </span>
          </label>
        </div>

        <p className="mt-2 text-xs font-medium text-slate-500">
          The student sees this status and note on their Visa Status page and is notified when it changes.
        </p>

        {error ? (
          <div role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-dark-blue transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-dark-blue px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-dark-blue/20 transition hover:bg-navy-hover disabled:opacity-60"
          >
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save update'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
