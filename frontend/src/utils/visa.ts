import type { StudentVisaProcess, VisaStatus } from '../types/visa';

interface VisaStatusMeta {
  label: string;
  /** Plain-language explanation shown to the student. */
  description: string;
  /** Full literal Tailwind classes (never interpolated, so the JIT emits them). */
  badge: string;
}

export const VISA_STATUS_META: Record<VisaStatus, VisaStatusMeta> = {
  not_started: {
    label: 'Not started',
    description: 'The office has not begun your visa process yet. You will be notified when it moves forward.',
    badge: 'bg-slate-100 text-slate-600 border border-slate-200',
  },
  documents_required: {
    label: 'Documents required',
    description: 'Additional documents are needed from you. Check the note below and submit them to the office.',
    badge: 'bg-amber-500/10 text-amber-700 border border-amber-500/20',
  },
  documents_submitted: {
    label: 'Documents submitted',
    description: 'Your documents have been received and are being checked by the office.',
    badge: 'bg-sky-500/10 text-sky-700 border border-sky-500/20',
  },
  application_submitted: {
    label: 'Visa application submitted',
    description: 'Your visa application has been lodged with the embassy or consulate.',
    badge: 'bg-indigo-500/10 text-indigo-700 border border-indigo-500/20',
  },
  under_review: {
    label: 'Under review',
    description: 'The embassy is reviewing your visa application. Processing times vary by country.',
    badge: 'bg-violet-500/10 text-violet-700 border border-violet-500/20',
  },
  appointment_scheduled: {
    label: 'Appointment scheduled',
    description: 'A visa appointment or biometrics visit has been arranged. See the note for the details.',
    badge: 'bg-blue-500/10 text-blue-700 border border-blue-500/20',
  },
  approved: {
    label: 'Approved',
    description: 'Your visa has been approved. The office will guide you on the next steps before travel.',
    badge: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
  },
  rejected: {
    label: 'Rejected',
    description: 'Your visa application was not approved. Contact the International Office to discuss next steps.',
    badge: 'bg-red-500/10 text-red-700 border border-red-500/20',
  },
};

/** Happy-path order shown as the progress tracker (`rejected` is a side-branch). */
export const VISA_STAGES: VisaStatus[] = [
  'documents_required',
  'documents_submitted',
  'application_submitted',
  'under_review',
  'appointment_scheduled',
  'approved',
];

export const VISA_STATUSES = Object.keys(VISA_STATUS_META) as VisaStatus[];

/**
 * Index into `VISA_STAGES` of the furthest stage reached, or -1 if none. A
 * rejected visa keeps the stage it had reached before the rejection.
 */
export const getReachedStageIndex = (visa: StudentVisaProcess | null): number => {
  if (!visa) return -1;

  const reached =
    visa.status === 'rejected'
      ? [...visa.history].reverse().find((entry) => entry.status !== 'rejected')?.status
      : visa.status;

  return reached ? VISA_STAGES.indexOf(reached) : -1;
};

export const formatVisaDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '';
