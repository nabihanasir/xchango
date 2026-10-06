import type { CourseRequestItem, ItemStatus, MatchBasis, MatchSnapshot, RequestStatus } from '../types/equivalency';

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

export const getUniversityName = (university: { name: string } | string | null | undefined) =>
  typeof university === 'string' ? university : university?.name || 'University not set';

/** The preliminary match made from the host course's catalogue description. */
export const getDescriptionMatch = (item: CourseRequestItem): MatchSnapshot | null => {
  const result = item.matchResult;
  return result?.homeCourseId && result.reasoning && typeof result.matchScore === 'number'
    ? {
        homeCourseId: result.homeCourseId,
        matchScore: result.matchScore,
        reasoning: result.reasoning,
        matchedBy: result.matchedBy,
        candidates: result.candidates,
      }
    : null;
};

/** The final match made from the outline the student uploaded at the host university. */
export const getOutlineMatch = (item: CourseRequestItem): MatchSnapshot | null => item.matchResult?.outlineMatch || null;

/** Once the student uploads an outline, the outline match decides the pairing. */
export const getActiveBasis = (item: CourseRequestItem): MatchBasis => (item.uploadedOutline ? 'outline' : 'description');

/** The active match, only when it describes the currently paired home course. */
export const getActiveMatch = (item: CourseRequestItem): MatchSnapshot | null => {
  const match = getActiveBasis(item) === 'outline' ? getOutlineMatch(item) : getDescriptionMatch(item);
  return match && item.homeCourseId && match.homeCourseId?._id === item.homeCourseId._id ? match : null;
};

export const getActiveCandidates = (item: CourseRequestItem) =>
  (getActiveBasis(item) === 'outline' ? getOutlineMatch(item) : getDescriptionMatch(item))?.candidates || [];
