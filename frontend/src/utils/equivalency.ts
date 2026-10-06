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

/** From this score a match counts as perfect and is shown in green. */
export const PERFECT_MATCH_SCORE = 85;
/** From this score a match is partial (amber); below it the match is weak (red). */
export const PARTIAL_MATCH_SCORE = 60;

export type MatchTierKey = 'perfect' | 'partial' | 'weak';

export interface MatchTier {
  key: MatchTierKey;
  label: string;
  /** Stroke of the score ring. */
  ring: string;
  /** Text colour for the score and its label. */
  text: string;
  /** Soft background and border for banners and chips. */
  soft: string;
  /** Left accent of a course card. */
  accent: string;
}

const MATCH_TIERS: Record<MatchTierKey, MatchTier> = {
  perfect: {
    key: 'perfect',
    label: 'Perfect match',
    ring: 'stroke-emerald-500',
    text: 'text-emerald-700',
    soft: 'bg-emerald-50 border-emerald-200',
    accent: 'border-l-emerald-500',
  },
  partial: {
    key: 'partial',
    label: 'Partial match',
    ring: 'stroke-amber-500',
    text: 'text-amber-700',
    soft: 'bg-amber-50 border-amber-200',
    accent: 'border-l-amber-400',
  },
  weak: {
    key: 'weak',
    label: 'Weak match',
    ring: 'stroke-red-500',
    text: 'text-red-700',
    soft: 'bg-red-50 border-red-200',
    accent: 'border-l-red-400',
  },
};

/** Colour code for a match score: green for a perfect match, amber for partial, red for weak. */
export const getMatchTier = (score: number): MatchTier =>
  MATCH_TIERS[score >= PERFECT_MATCH_SCORE ? 'perfect' : score >= PARTIAL_MATCH_SCORE ? 'partial' : 'weak'];

export const getUniversityName =(university: { name: string } | string | null | undefined) =>
  typeof university === 'string' ? university : university?.name || 'University not set';

/** The preliminary match made from the host course's catalogue description. */
export const getDescriptionMatch = (item: CourseRequestItem): MatchSnapshot | null => {
  const result = item.matchResult;
  return result?.homeCourseId && result.reasoning && typeof result.matchScore === 'number'
    ? {
        homeCourseId: result.homeCourseId,
        matchScore: result.matchScore,
        contentScore: result.contentScore,
        eligibility: result.eligibility,
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
