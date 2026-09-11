import type { ResultStatus } from '../types/result';

export const getResultStatusClasses = (status: ResultStatus) => {
  switch (status) {
    case 'published':
      return 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20';
    default:
      return 'bg-amber-500/10 text-amber-700 border border-amber-500/20';
  }
};

export const formatDisplayDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '';
