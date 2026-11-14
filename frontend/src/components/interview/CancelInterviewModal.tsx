import { useState } from 'react';
import Modal from '../Modal';
import InlineMessage from './InlineMessage';
import { interviewCancelReasons } from '../../types/application';

interface Props {
  /** e.g. "Fri 21 Nov, 09:00–09:30 PKT" */
  when: string;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (reason: string, details: string) => void;
}

/** A confirmed interview can only be cancelled with a reason chosen from this list. */
export default function CancelInterviewModal({ when, busy = false, error = '', onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  return (
    <Modal onClose={onClose} locked={busy} labelledBy="cancel-interview-title">
      <div className="space-y-5 overflow-y-auto p-6">
        <div>
          <h2 id="cancel-interview-title" className="text-xl font-bold text-slate-900">
            Cancel confirmed interview?
          </h2>
          <p className="mt-1 text-sm text-slate-600">{when}</p>
          <p className="mt-2 text-sm text-slate-500">
            This interview is already confirmed. Choose a reason to cancel it — the other person will be notified.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="sr-only">Reason</legend>
          {interviewCancelReasons.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
                reason === option.value ? 'border-dark-blue bg-dark-blue/5 text-dark-blue' : 'border-slate-200 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="cancel-reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Optional details"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
        />

        {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            Keep interview
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason, details.trim())}
            disabled={busy || !reason}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Cancelling…' : 'Cancel interview'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
