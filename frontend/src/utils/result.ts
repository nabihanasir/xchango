import type { ResultStatus } from '../types/result';

export const getResultStatusClasses = (status: ResultStatus) => {
  switch (status) {
    case 'published':
      return 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20';
    default:
      return 'bg-amber-500/10 text-amber-700 border border-amber-500/20';
  }
};

export const verificationLabels: Record<string, string> = {
  none: 'No document',
  submitted: 'Awaiting review',
  returned: 'Returned',
  verified: 'Verified',
};

export const getVerificationClasses = (status: string) => {
  switch (status) {
    case 'verified':
      return 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20';
    case 'returned':
      return 'bg-red-500/10 text-red-700 border border-red-500/20';
    case 'submitted':
      return 'bg-amber-500/10 text-amber-700 border border-amber-500/20';
    default:
      return 'bg-slate-100 text-slate-500 border border-slate-200';
  }
};

export const formatDisplayDate =(value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '';
