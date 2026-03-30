import type { ItemStatus, RequestStatus } from '../types/equivalency';

export const formatDisplayDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const getRequestStatusClasses = (status: RequestStatus) => {
  switch (status) {
    case 'approved':
      return 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20';
    case 'rejected':
      return 'bg-red-500/10 text-red-700 border border-red-500/20';
    case 'under_review':
      return 'bg-blue-500/10 text-blue-700 border border-blue-500/20';
    default:
      return 'bg-amber-500/10 text-amber-700 border border-amber-500/20';
  }
};

export const getItemStatusClasses = (status: ItemStatus) => {
  switch (status) {
    case 'approved':
      return 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20';
    case 'rejected':
      return 'bg-red-500/10 text-red-700 border border-red-500/20';
    default:
      return 'bg-slate-200 text-slate-700 border border-slate-300';
  }
};

export const getScoreBadgeClasses = (score: number) => {
  if (score >= 80) {
    return 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20';
  }

  if (score >= 50) {
    return 'bg-amber-500/10 text-amber-700 border border-amber-500/20';
  }

  return 'bg-red-500/10 text-red-700 border border-red-500/20';
};

export const getScoreTrackClasses = (score: number) => {
  if (score >= 80) {
    return 'bg-emerald-500';
  }

  if (score >= 50) {
    return 'bg-amber-500';
  }

  return 'bg-red-500';
};

export const getUniversityName = (university: { name: string } | string | undefined) =>
  typeof university === 'string' ? university : university?.name || 'University not set';
