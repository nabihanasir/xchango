import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  LoaderCircle,
  RefreshCcw,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import CourseChip from '../../components/advisor/CourseChip';
import EligibilityChecklist from '../../components/advisor/EligibilityChecklist';
import { countConcerns } from '../../components/advisor/EligibilityPills';
import ScoreRing from '../../components/advisor/ScoreRing';
import { useAuth } from '../../context/AuthContext';
import { equivalencyApi } from '../../lib/api';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type {
  AIMatchStatus,
  CourseRequest,
  CourseRequestItem,
  CourseSummary,
  EligibilityCheck,
  ItemStatus,
  MatchSnapshot,
} from '../../types/equivalency';
import {
  PERFECT_MATCH_SCORE,
  formatDisplayDate,
  getActiveBasis,
  getActiveCandidates,
  getActiveMatch,
  getDescriptionMatch,
  getMatchTier,
  getOutlineMatch,
  getRequestStatusClasses,
} from '../../utils/equivalency';
import { toBullets } from '../../utils/bullets';
import Notice from '../../components/Notice';

type StatusDrafts = Record<string, ItemStatus>;
type CommentDrafts = Record<string, string>;

const getInitialStatusDrafts = (items: CourseRequestItem[]): StatusDrafts =>
  items.reduce<StatusDrafts>((acc, item) => {
    acc[item._id] = item.status;
    return acc;
  }, {});

const getInitialCommentDrafts = (items: CourseRequestItem[]): CommentDrafts =>
  items.reduce<CommentDrafts>((acc, item) => {
    acc[item._id] = item.advisorComment || '';
    return acc;
  }, {});

const getCourseTitle = (course?: CourseSummary | null) => course?.title || course?.name || course?.code || 'Untitled course';

const MATCH_POLL_INTERVAL_MS = 4000;
const MAX_ALTERNATIVES = 3;

const getAlternatives = (item: CourseRequestItem) =>
  getActiveCandidates(item)
    .filter((candidate) => candidate.homeCourseId?._id && candidate.homeCourseId._id !== item.homeCourseId?._id)
    .slice(0, MAX_ALTERNATIVES);

const isAdvisorOverride = (item: CourseRequestItem) => {
  const topCandidate = getActiveCandidates(item)[0];
  return Boolean(topCandidate && item.homeCourseId && topCandidate.homeCourseId?._id !== item.homeCourseId._id);
};

/** Every eligibility concern on a course: the checks for its paired home course plus its place in the credit limit. */
const getChecks = (item: CourseRequestItem, match: MatchSnapshot | null): EligibilityCheck[] => [
  ...(match?.eligibility?.checks ?? []),
  ...(item.creditCap && item.creditCap.status !== 'unknown' ? [item.creditCap] : []),
];

const ITEM_STATUS_STYLES: Record<ItemStatus, string> = {
  approved: 'border-emerald-300 bg-emerald-600 text-white',
  rejected: 'border-red-300 bg-red-600 text-white',
  pending: '',
};

/** A bar that grows to its value when it appears. */
function AnimatedBar({ value, className }: { value: number; className: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none ${className}`}
        style={{ width: `${shown}%` }}
      />
    </div>
  );
}

interface MatchScoreTileProps {
  label: string;
  match: MatchSnapshot | null;
  status?: AIMatchStatus;
  isActive: boolean;
  emptyText: string;
}

/** One of the two match scores: from the catalogue description (preliminary) or the uploaded outline (final). */
function MatchScoreTile({ label, match, status, isActive, emptyText }: MatchScoreTileProps) {
  const tier = match ? getMatchTier(match.matchScore) : null;

  return (
    <div
      className={`rounded-[1.25rem] border px-4 py-3 transition ${
        tier ? tier.soft : 'border-dashed border-slate-300 bg-white'
      } ${isActive ? 'ring-2 ring-accent-yellow/50' : 'opacity-75'}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      {status === 'in_progress' ? (
        <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Matching…
        </p>
      ) : match && tier ? (
        <>
          <p className={`mt-1 text-2xl font-bold ${tier.text}`}>{match.matchScore}/100</p>
          <div className="mt-2">
            <AnimatedBar value={match.matchScore} className={tier.ring.replace('stroke-', 'bg-')} />
          </div>
          {match.contentScore !== undefined && match.contentScore !== match.matchScore ? (
            <p className="mt-2 text-xs font-medium text-slate-500">Content match {match.contentScore}, lowered by eligibility</p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-xs font-medium text-slate-500">{status === 'failed' ? 'Match failed' : emptyText}</p>
      )}
    </div>
  );
}

const VISIBLE_TOPICS = 5;
const CLAMP_SUMMARY_AFTER = 240;

/** One column of topics as a plain list, showing the first few so the page stays short. */
const TOPIC_TONES = {
  red: { panel: 'border-red-100 bg-red-50/50', dot: 'bg-red-500', heading: 'text-red-700' },
  sky: { panel: 'border-sky-100 bg-sky-50/50', dot: 'bg-sky-500', heading: 'text-sky-700' },
  emerald: { panel: 'border-emerald-100 bg-emerald-50/50', dot: 'bg-emerald-500', heading: 'text-emerald-700' },
} as const;

function TopicColumn({ title, topics, tone }: { title: string; topics: string[]; tone: keyof typeof TOPIC_TONES }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? topics : topics.slice(0, VISIBLE_TOPICS);
  const hidden = topics.length - VISIBLE_TOPICS;
  const styles = TOPIC_TONES[tone];

  return (
    <div className={`min-w-0 rounded-[1.1rem] border p-3 ${styles.panel}`}>
      <div className='flex items-center justify-between gap-2'>
        <p className={`text-sm font-bold ${styles.heading}`}>{title}</p>
        <span className='shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600'>{topics.length}</span>
      </div>
      {topics.length ? (
        <ul className='mt-2 space-y-2'>
          {shown.map((topic) => (
            <li key={topic} className='flex gap-2 text-sm font-medium leading-5 text-slate-700'>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styles.dot}`} aria-hidden='true' />
              <span className='min-w-0'>{topic}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className='mt-2 text-sm font-medium text-slate-400'>None</p>
      )}
      {hidden > 0 ? (
        <button
          type='button'
          onClick={() => setShowAll((current) => !current)}
          className='mt-2 text-sm font-bold text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline'
        >
          {showAll ? 'Show fewer' : `+${hidden} more`}
        </button>
      ) : null}
    </div>
  );
}

/** A long AI summary cut to three lines, with a link to read the rest. */
function ClampedSummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > CLAMP_SUMMARY_AFTER;

  return (
    <div className="mt-2">
      <p className={`text-sm font-medium leading-6 text-slate-700 ${isLong && !expanded ? 'line-clamp-3' : ''}`}>{text}</p>
      {isLong ? (
        <button type="button" onClick={() => setExpanded((current) => !current)} className="mt-1 text-xs font-bold text-teal-700 hover:text-teal-900">
          {expanded ? 'Show less' : 'Read more'}
        </button>
      ) : null}
    </div>
  );
}

type PaneTab = 'comparison' | 'eligibility' | 'details' | 'tools';

const LABEL_CLASS = 'text-xs font-bold uppercase tracking-[0.2em] text-slate-500';
const INPUT_CLASS =
  'w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10';

interface DescriptionBoxProps {
  label: string;
  text?: string | null;
  emptyText: string;
  asText: boolean;
  boxClass: string;
  labelClass: string;
}

/** A course description as bullet points when it splits cleanly, otherwise as the original text. */
function DescriptionBox({ label, text, emptyText, asText, boxClass, labelClass }: DescriptionBoxProps) {
  const bullets = asText ? null : toBullets(text);

  return (
    <div className={`min-w-0 rounded-[1.1rem] border p-3 ${boxClass}`}>
      <p className={`text-xs font-bold uppercase tracking-[0.16em] ${labelClass}`}>{label}</p>
      {!text ? (
        <p className="mt-2 text-sm font-medium italic text-slate-400">{emptyText}</p>
      ) : bullets ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-medium leading-6 text-slate-600 marker:text-teal-600">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{text}</p>
      )}
    </div>
  );
}

const DECISION_LABELS: Record<ItemStatus, { label: string; classes: string }> = {
  approved: { label: 'Approved', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejected', classes: 'border-red-200 bg-red-50 text-red-700' },
  pending: { label: 'Undecided', classes: 'border-slate-200 bg-slate-50 text-slate-500' },
};

interface CourseRailProps {
  items: CourseRequestItem[];
  statusDrafts: StatusDrafts;
  activeId: string;
  onSelect: (itemId: string) => void;
}

/** The list of requested courses: score, home course and decision for each, so progress is visible at a glance. */
function CourseRail({ items, statusDrafts, activeId, onSelect }: CourseRailProps) {
  return (
    <nav aria-label="Requested courses" className="space-y-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
      {items.map((item, index) => {
        const match = getActiveMatch(item);
        const { failed } = countConcerns(getChecks(item, match));
        const decision = DECISION_LABELS[statusDrafts[item._id] ?? item.status];
        const isActive = item._id === activeId;

        return (
          <button
            key={item._id}
            type="button"
            onClick={() => onSelect(item._id)}
            aria-current={isActive ? 'true' : undefined}
            className={`flex w-full items-center gap-3 rounded-[1.25rem] border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow/60 ${
              isActive ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            {typeof match?.matchScore === 'number' ? (
              <ScoreRing score={match.matchScore} size={40} />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                {index + 1}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-slate-800">{getCourseTitle(item.hostCourseId)}</span>
              <span className="mt-0.5 flex items-center gap-2 text-xs font-semibold">
                <span className="truncate text-slate-500">{item.homeCourseId?.code || 'No home course yet'}</span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 ${decision.classes}`}>{decision.label}</span>
              </span>
            </span>
            {failed ? <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-label={`${failed} failed checks`} /> : null}
          </button>
        );
      })}
    </nav>
  );
}

interface CourseDetailPaneProps {
  item: CourseRequestItem;
  position: number;
  total: number;
  status: ItemStatus;
  comment: string;
  tab: PaneTab;
  showOriginalText: boolean;
  loadingActionId: string;
  filteredHomeCourses: CourseSummary[];
  courseSearch: string;
  courseLoadError: string;
  /** The request has been approved or rejected, so the decision and re-pairing controls are read-only. */
  locked: boolean;
  onTab: (tab: PaneTab) => void;
  onToggleOriginalText: () => void;
  onStep: (delta: number) => void;
  onStatus: (status: ItemStatus) => void;
  onComment: (value: string) => void;
  onSearch: (value: string) => void;
  onChangeHome: (homeCourseId: string) => void;
  onRerunAuto: () => void;
  onRerunOutline: () => void;
}

/** One requested course: the pair and decision always on top, with the evidence and tools in tabs below. */
function CourseDetailPane({
  item,
  position,
  total,
  status,
  comment,
  tab,
  showOriginalText,
  loadingActionId,
  filteredHomeCourses,
  courseSearch,
  courseLoadError,
  locked,
  onTab,
  onToggleOriginalText,
  onStep,
  onStatus,
  onComment,
  onSearch,
  onChangeHome,
  onRerunAuto,
  onRerunOutline,
}: CourseDetailPaneProps) {
  const basis = getActiveBasis(item);
  const activeMatch = getActiveMatch(item);
  const alternatives = getAlternatives(item);
  const activeStatus = basis === 'outline' ? item.outlineMatchStatus : item.aiMatchStatus;
  const isMatching = activeStatus === 'in_progress';
  const isBusy = loadingActionId.endsWith(`-${item._id}`);
  // The outline match after arrival is a separate check, so only the description match and pairing are locked.
  const rerunLocked = locked && basis === 'description';
  const checks = getChecks(item, activeMatch);
  const { failed, warned } = countConcerns(checks);
  const score = activeMatch?.matchScore;
  const tier = typeof score === 'number' ? getMatchTier(score) : null;
  const failures = [
    item.aiMatchStatus === 'failed'
      ? { key: 'description', label: 'Description match failed', error: item.aiMatchError, retry: onRerunAuto }
      : null,
    item.outlineMatchStatus === 'failed'
      ? { key: 'outline', label: 'Outline match failed', error: item.outlineMatchError, retry: onRerunOutline }
      : null,
  ].filter((failure) => failure !== null);

  // When no AI model produced the match (keyword estimate, failure, or nothing yet) the button is shown on the row itself.
  const needsAiMatch =
    !isMatching && (activeMatch?.matchedBy === 'heuristic' || failures.length > 0 || !item.homeCourseId || activeStatus === 'not_started');
  const aiMatchLabel = failures.length ? 'Retry AI match' : activeMatch?.matchedBy === 'heuristic' ? 'Re-run AI match' : 'Run AI match';

  const concernCount = failed + warned;
  const tabs: Array<{ key: PaneTab; label: string; badge?: { text: string; classes: string } }> = [
    { key: 'comparison', label: 'Comparison' },
    {
      key: 'eligibility',
      label: 'Eligibility',
      badge: concernCount
        ? { text: String(concernCount), classes: failed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700' }
        : undefined,
    },
    { key: 'details', label: 'Course details' },
    { key: 'tools', label: 'Tools', badge: failures.length ? { text: '!', classes: 'bg-red-100 text-red-700' } : undefined },
  ];

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-[1.75rem] border border-l-4 border-slate-200 bg-white/90 shadow-soft lg:h-[calc(100vh-10rem)] lg:min-h-[36rem] ${tier ? tier.accent : 'border-l-slate-300'}`}
    >
      <div className="flex shrink-0 flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="grid min-w-0 flex-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <CourseChip kind="host" name={getCourseTitle(item.hostCourseId)} code={item.hostCourseId.code} creditHours={item.hostCourseId.creditHours} />
          <ArrowRight
            className={`mx-auto hidden h-5 w-5 text-slate-300 md:block ${isMatching ? 'motion-safe:animate-pulse text-accent-yellow' : ''}`}
          />
          {isMatching ? (
            <span className="flex h-[3.4rem] items-center gap-3 rounded-[1.1rem] border border-dashed border-slate-300 bg-[linear-gradient(90deg,#f1f5f9,#e2e8f0,#f1f5f9)] bg-[length:200%_100%] px-4 text-sm font-semibold text-slate-500 motion-safe:animate-shimmer">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Finding the closest home course…
            </span>
          ) : item.homeCourseId ? (
            <CourseChip kind="home" name={getCourseTitle(item.homeCourseId)} code={item.homeCourseId.code} creditHours={item.homeCourseId.creditHours} />
          ) : (
            <span className="flex h-[3.4rem] items-center rounded-[1.1rem] border border-dashed border-slate-300 px-4 text-sm font-medium text-slate-500">
              {activeStatus === 'failed' ? 'No match — open Tools to retry' : 'No home course matched yet'}
            </span>
          )}
        </div>

        {typeof score === 'number' ? <ScoreRing score={score} size={52} /> : null}

        <div className="flex shrink-0 items-center gap-1.5 self-end rounded-full border border-slate-200 bg-slate-50 p-1 lg:self-auto" role="group" aria-label="Course decision">
          {(['approved', 'rejected'] as const).map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => onStatus(status === target ? 'pending' : target)}
              aria-pressed={status === target}
              disabled={locked}
              className={`inline-flex disabled:cursor-not-allowed items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                status === target ? `${ITEM_STATUS_STYLES[target]} scale-105 shadow` : 'border-transparent text-slate-500 hover:bg-white'
              }`}
            >
              {target === 'approved' ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {target === 'approved' ? 'Approve' : 'Reject'}
            </button>
          ))}
        </div>
      </div>

      {/* One-line summary, always visible: what the match is worth and what needs attention. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-4 text-sm font-semibold">
        {tier ? <span className={`rounded-full border px-2.5 py-1 ${tier.soft} ${tier.text}`}>{tier.label}</span> : null}
        {failed ? (
          <button
            type="button"
            onClick={() => onTab('eligibility')}
            className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700 hover:bg-red-100"
          >
            {failed} check{failed > 1 ? 's' : ''} failed
          </button>
        ) : null}
        {warned ? (
          <button
            type="button"
            onClick={() => onTab('eligibility')}
            className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 hover:bg-amber-100"
          >
            {warned} to check
          </button>
        ) : null}
        {tier && !failed && !warned && checks.length ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">All checks passed</span>
        ) : null}
        {failures.length ? (
          <button
            type="button"
            onClick={() => onTab('tools')}
            className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700 hover:bg-red-100"
          >
            Matching error · open Tools
          </button>
        ) : null}
        {isAdvisorOverride(item) ? (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-600">Advisor-selected</span>
        ) : null}
        {activeMatch?.matchedBy === 'heuristic' ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">Keyword estimate · AI match unavailable</span>
        ) : null}
        {basis === 'description' && !isMatching && item.homeCourseId ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">Preliminary</span>
        ) : null}
        {needsAiMatch ? (
          <button
            type="button"
            onClick={basis === 'outline' ? onRerunOutline : onRerunAuto}
            disabled={isBusy || rerunLocked}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-dark-blue px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-navy-hover disabled:opacity-60 motion-safe:animate-pop-in"
          >
            {isBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isBusy ? 'Matching…' : aiMatchLabel}
          </button>
        ) : null}
      </div>

      <div role="tablist" aria-label="Course review sections" className="flex shrink-0 gap-1 overflow-x-auto overflow-y-hidden border-t border-slate-100 px-4">
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            id={`tab-${item._id}-${entry.key}`}
            aria-selected={tab === entry.key}
            aria-controls={`panel-${item._id}`}
            onClick={() => onTab(entry.key)}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow/60 ${
              tab === entry.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {entry.label}
            {entry.badge ? <span className={`rounded-full px-2 text-xs ${entry.badge.classes}`}>{entry.badge.text}</span> : null}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${item._id}`} aria-labelledby={`tab-${item._id}-${tab}`} className="max-h-[70vh] min-h-0 flex-1 space-y-4 overflow-y-auto border-t border-slate-100 p-4 lg:max-h-none">
        {tab === 'comparison' ? (
          <>
            {tier && activeMatch ? (
              <div className={`rounded-[1.25rem] border p-4 ${tier.soft}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={`text-sm font-bold ${tier.text}`}>
                    {tier.label} · {activeMatch.matchScore}/100
                  </p>
                  {activeMatch.contentScore !== undefined && activeMatch.contentScore !== activeMatch.matchScore ? (
                    <p className="text-xs font-semibold text-slate-500">Content match {activeMatch.contentScore}, lowered by eligibility</p>
                  ) : null}
                </div>
                {activeMatch.reasoning ? <ClampedSummary text={activeMatch.reasoning.summary} /> : null}
              </div>
            ) : null}
            {activeMatch?.reasoning ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <TopicColumn title="Only in Home University" topics={activeMatch.reasoning.missingTopics} tone="red" />
                  <TopicColumn title="Only in Host University" topics={activeMatch.reasoning.additionalTopics} tone="sky" />
                  <TopicColumn title="Topics common in both" topics={activeMatch.reasoning.overlappingTopics} tone="emerald" />
                </div>
                <p className="text-sm font-medium leading-6 text-slate-600">
                  <span className="font-bold text-slate-700">Credit hours: </span>
                  {activeMatch.reasoning.creditHourAssessment}
                </p>
              </>
            ) : (
              <p className="rounded-[1.25rem] border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-500">
                {isMatching ? 'Matching is still running…' : 'No topic comparison yet. Run the match from the Tools tab.'}
              </p>
            )}
          </>
        ) : null}

        {tab === 'eligibility' ? (
          checks.length ? (
            <EligibilityChecklist checks={checks} />
          ) : (
            <p className="rounded-[1.25rem] border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-500">
              No eligibility checks yet. They appear once a home course is matched.
            </p>
          )
        ) : null}

        {tab === 'details' ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className={LABEL_CLASS}>Descriptions</p>
              <button type="button" onClick={onToggleOriginalText} className="text-xs font-bold text-teal-700 transition hover:text-teal-900">
                {showOriginalText ? 'Show as bullets' : 'Show original text'}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <DescriptionBox
                label="Host description"
                text={item.hostCourseId.description}
                emptyText="No description provided."
                asText={showOriginalText}
                boxClass="border-sky-200 bg-sky-50/60"
                labelClass="text-sky-700"
              />
              <DescriptionBox
                label="Home description"
                text={item.homeCourseId?.description}
                emptyText="No home course matched, or it has no description."
                asText={showOriginalText}
                boxClass="border-violet-200 bg-violet-50/60"
                labelClass="text-violet-700"
              />
            </div>
            <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                <FileText className="h-3.5 w-3.5" />
                Student's course outline
              </p>
              {item.uploadedOutline ? (
                <>
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {item.uploadedOutline.fileUrl ? (
                      <a href={resolveUploadUrl(item.uploadedOutline.fileUrl)} target="_blank" rel="noreferrer" className="font-bold text-teal-700 underline">
                        {item.uploadedOutline.fileName || 'View uploaded file'}
                      </a>
                    ) : (
                      'Pasted text'
                    )}{' '}
                    · uploaded {formatDisplayDate(item.uploadedOutline.uploadedAt)}
                  </p>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-xs font-bold text-slate-500">Show outline text</summary>
                    {(() => {
                      const outlineBullets = showOriginalText ? null : toBullets(item.uploadedOutline.text);
                      return outlineBullets ? (
                        <ul className="mt-2 max-h-64 list-disc space-y-1 overflow-y-auto rounded-[1rem] bg-slate-50 p-3 pl-8 text-xs font-medium leading-6 text-slate-600 marker:text-teal-600">
                          {outlineBullets.map((bullet, index) => (
                            <li key={`${index}-${bullet}`}>{bullet}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-[1rem] bg-slate-50 p-3 text-xs font-medium leading-6 text-slate-600">
                          {item.uploadedOutline.text}
                        </p>
                      );
                    })()}
                  </details>
                </>
              ) : (
                <p className="mt-2 text-sm font-medium text-slate-400">
                  Not uploaded yet. The student can upload it once their arrival at the host university is recorded.
                </p>
              )}
            </div>
          </>
        ) : null}

        {tab === 'tools' ? (
          <div className="space-y-5">
            <section className="space-y-3">
              <p className={LABEL_CLASS}>Match scores</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <MatchScoreTile label="Description match · preliminary" match={getDescriptionMatch(item)} status={item.aiMatchStatus} isActive={basis === 'description'} emptyText="Not matched yet" />
                <MatchScoreTile label="Outline match · final" match={getOutlineMatch(item)} status={item.outlineMatchStatus} isActive={basis === 'outline'} emptyText="Waiting for the student's outline" />
              </div>
              <Button type="button" variant="secondary" onClick={basis === 'outline' ? onRerunOutline : onRerunAuto} disabled={isBusy || isMatching || rerunLocked}>
                {isBusy || isMatching ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                {isMatching ? 'Matching…' : basis === 'outline' ? 'Re-run outline match' : 'Re-run auto-match'}
              </Button>
              {failures.map((failure) => (
                <div key={failure.key} className="rounded-[1.25rem] border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-bold">{failure.label}</p>
                      <p className="mt-1">{failure.error || 'Unknown matching error.'}</p>
                      <button type="button" onClick={failure.retry} disabled={isBusy} className="mt-2 inline-flex items-center font-bold text-red-700 underline">
                        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {alternatives.length ? (
              <section className="space-y-3 border-t border-slate-100 pt-4">
                <p className={LABEL_CLASS}>Other close matches · {alternatives.length}</p>
                <ul className="space-y-2">
                  {alternatives.map((candidate) => {
                    const concerns = candidate.eligibility?.checks.filter((check) => check.status === 'fail' || check.status === 'warn') ?? [];
                    return (
                      <li
                        key={`${item._id}-candidate-${candidate.homeCourseId._id}`}
                        className="flex flex-col gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
                      >
                        <ScoreRing score={candidate.matchScore} size={44} />
                        <div className="min-w-0 flex-1 space-y-2">
                          <CourseChip kind="home" size="sm" name={getCourseTitle(candidate.homeCourseId)} code={candidate.homeCourseId.code} creditHours={candidate.homeCourseId.creditHours} />
                          <p className="text-xs font-medium leading-5 text-slate-500">{candidate.reasoning.summary}</p>
                          {concerns.length ? <EligibilityChecklist checks={concerns} /> : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => onChangeHome(candidate.homeCourseId._id)}
                          disabled={isBusy || isMatching || locked}
                          className="shrink-0 rounded-[1rem] border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
                        >
                          Use this instead
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section className="space-y-2 border-t border-slate-100 pt-4">
              <p className={LABEL_CLASS}>Choose a different home course</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(event) => onSearch(event.target.value)}
                  placeholder="Search home courses..."
                  aria-label="Search home courses"
                  className={`${INPUT_CLASS} sm:w-2/5`}
                />
                <select
                  value={item.homeCourseId?._id || ''}
                  onChange={(event) => onChangeHome(event.target.value)}
                  aria-label="Home course"
                  className={`${INPUT_CLASS} bg-slate-50 sm:flex-1`}
                  disabled={!filteredHomeCourses.length || isBusy || locked}
                >
                  <option value="" disabled>
                    {filteredHomeCourses.length ? 'Select a home course' : 'No home courses available'}
                  </option>
                  {filteredHomeCourses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {getCourseTitle(course)} · {course.creditHours} CH
                    </option>
                  ))}
                </select>
              </div>
              {courseLoadError ? <Notice tone="error">{courseLoadError}</Notice> : null}
              {!filteredHomeCourses.length && !courseLoadError ? (
                <p className="rounded-[1.25rem] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500">
                  No home courses available. Contact admin.
                </p>
              ) : null}
              <p className="text-xs font-medium text-slate-400">The AI scores the course you pick straight away.</p>
            </section>
          </div>
        ) : null}

        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4">
          <label className={LABEL_CLASS} htmlFor={`comment-${item._id}`}>
            Advisor comment for this course
          </label>
          <textarea
            id={`comment-${item._id}`}
            value={comment}
            onChange={(event) => onComment(event.target.value)}
            readOnly={locked}
            rows={2}
            className="mt-2 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
            placeholder="Optional feedback for this specific course pair."
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
        <p className="text-sm font-bold text-slate-500">
          Course {position} of {total}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onStep(-1)}
            disabled={position <= 1}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            disabled={position >= total}
            className="inline-flex items-center gap-1 rounded-full bg-dark-blue px-3.5 py-1.5 text-sm font-bold text-white transition hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

const StatTile = ({ label, value, tone = 'text-slate-800' }: { label: string; value: string; tone?: string }) => (
  <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3 text-center">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
  </div>
);

export default function AdvisorEquivalencyRequestDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const [request, setRequest] = useState<CourseRequest | null>(null);
  const [homeCourses, setHomeCourses] = useState<CourseSummary[]>([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [statusDrafts, setStatusDrafts] = useState<StatusDrafts>({});
  const [commentDrafts, setCommentDrafts] = useState<CommentDrafts>({});
  const [advisorComment, setAdvisorComment] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemTabs, setItemTabs] = useState<Record<string, PaneTab>>({});
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDecision, setIsConfirmingDecision] = useState(false);
  const [error, setError] = useState('');
  const [courseLoadError, setCourseLoadError] = useState('');

  const syncRequestState = (nextRequest: CourseRequest) => {
    setRequest(nextRequest);
    setStatusDrafts(getInitialStatusDrafts(nextRequest.items));
    setCommentDrafts(getInitialCommentDrafts(nextRequest.items));
    setAdvisorComment(nextRequest.advisorComment || '');
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user?.token || !id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      setCourseLoadError('');

      const [requestResult, coursesResult] = await Promise.allSettled([
        equivalencyApi.getAdvisorRequestById(user.token, id),
        equivalencyApi.getHomeCourses(user.token),
      ]);

      if (requestResult.status === 'fulfilled') {
        syncRequestState(requestResult.value);
      } else {
        setError(requestResult.reason instanceof Error ? requestResult.reason.message : 'Unable to load this request.');
      }

      if (coursesResult.status === 'fulfilled') {
        setHomeCourses(coursesResult.value);
      } else {
        setHomeCourses([]);
        setCourseLoadError('Unable to load courses. Please try again.');
      }

      setIsLoading(false);
    };

    void loadData();
  }, [id, user?.token]);

  const hasPendingMatches = Boolean(
    request?.items.some((item) => item.aiMatchStatus === 'in_progress' || item.outlineMatchStatus === 'in_progress')
  );

  // Matching runs in the background after the student submits, so poll until every course has a result.
  useEffect(() => {
    if (!hasPendingMatches || !user?.token || !id) {
      return undefined;
    }

    const token = user.token;
    const intervalId = window.setInterval(() => {
      equivalencyApi
        .getAdvisorRequestById(token, id)
        .then((nextRequest) => setRequest(nextRequest))
        .catch(() => undefined);
    }, MATCH_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [hasPendingMatches, id, user?.token]);

  const filteredHomeCourses = useMemo(() => {
    const query = courseSearch.trim().toLowerCase();
    const sorted = [...homeCourses].sort((left, right) => getCourseTitle(left).localeCompare(getCourseTitle(right)));

    if (!query) {
      return sorted;
    }

    return sorted.filter((course) => {
      const title = getCourseTitle(course).toLowerCase();
      const description = (course.description || '').toLowerCase();
      const creditHours = String(course.creditHours);
      return title.includes(query) || description.includes(query) || creditHours.includes(query);
    });
  }, [courseSearch, homeCourses]);

  const summary = useMemo(() => {
    const items = request?.items ?? [];
    const scores = items.map((item) => getActiveMatch(item)?.matchScore).filter((score): score is number => typeof score === 'number');
    const statuses = Object.values(statusDrafts);
    return {
      total: items.length,
      matched: scores.length,
      perfect: scores.filter((score) => score >= PERFECT_MATCH_SCORE).length,
      approved: statuses.filter((status) => status === 'approved').length,
      rejected: statuses.filter((status) => status === 'rejected').length,
    };
  }, [request?.items, statusDrafts]);

  // Open on the first course still waiting for a decision, or the first course once everything is decided.
  const activeItem =
    request?.items.find((item) => item._id === selectedItemId) ??
    request?.items.find((item) => (statusDrafts[item._id] ?? item.status) === 'pending') ??
    request?.items[0];

  const stepCourse = (delta: number) => {
    if (!request || !activeItem) {
      return;
    }

    const index = request.items.findIndex((item) => item._id === activeItem._id);
    const next = request.items[Math.min(request.items.length - 1, Math.max(0, index + delta))];
    setSelectedItemId(next._id);
  };

  /** Runs one advisor action on a course and shows the updated request. */
  const runItemAction = async (
    actionKey: string,
    itemId: string,
    action: (token: string, requestId: string) => Promise<CourseRequest>,
    failureMessage: string,
    showComparison = false
  ) => {
    if (!user?.token || !request) {
      return;
    }

    try {
      setLoadingActionId(`${actionKey}-${itemId}`);
      setError('');
      syncRequestState(await action(user.token, request._id));
      if (showComparison) {
        setSelectedItemId(itemId);
        setItemTabs((current) => ({ ...current, [itemId]: 'comparison' }));
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : failureMessage);
    } finally {
      setLoadingActionId('');
    }
  };

  /** Checks the per-course choices, then asks the advisor to confirm because the decision is final. */
  const askToConfirmItemDecisions = () => {
    if (!request) {
      return;
    }

    if (request.items.some((item) => statusDrafts[item._id] === 'pending')) {
      setError('Set every course to approved or rejected before submitting your decisions.');
      return;
    }

    setError('');
    setIsConfirmingDecision(true);
  };

  const handleSubmitItemDecisions = async () => {
    if (!user?.token || !request) {
      return;
    }

    const hasPendingDraft = request.items.some((item) => statusDrafts[item._id] === 'pending');
    if (hasPendingDraft) {
      setError('Set every course to approved or rejected before submitting your decisions.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      const response = await equivalencyApi.submitAdvisorDecision(user.token, request._id, {
        advisorComment,
        itemDecisions: request.items.map((item) => ({
          itemId: item._id,
          status: statusDrafts[item._id],
          advisorComment: commentDrafts[item._id],
        })),
      });
      syncRequestState(response);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to submit item decisions.');
    } finally {
      setIsSaving(false);
      setIsConfirmingDecision(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-[2rem] p-8 text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="glass-card rounded-[2rem] p-8">
        <h2 className="text-2xl font-bold text-slate-800">Request not found</h2>
      </div>
    );
  }

  const isFinal = request.status === 'approved' || request.status === 'rejected';
  const decided = summary.approved + summary.rejected;
  const plan = request.planSummary;

  // Things that make the eligibility checks incomplete or flag a problem, shown only when there is something to say.
  const needsCourseTypeReview = Boolean(request.programOutline && !request.programOutline.categoriesReviewed);
  const planIssues: string[] = [];
  if (plan && !plan.outlineAvailable && !plan.transcriptAvailable) {
    planIssues.push('No curriculum or transcript is uploaded, so eligibility could not be checked. Matches are based on course content only.');
  } else if (plan && !plan.outlineAvailable) {
    planIssues.push('No curriculum is uploaded, so plan, course type and credit limit could not be checked.');
  } else if (plan && !plan.transcriptAvailable) {
    planIssues.push('No transcript is uploaded, so the semester and passed courses are unknown.');
  }
  if (plan && plan.withinCap === false && plan.allowedCredits != null) {
    planIssues.push(`${plan.requestedCredits - plan.allowedCredits} credit hours over the limit for semester ${plan.currentSemester}. The courses that push it over are flagged.`);
  }
  if (needsCourseTypeReview) {
    planIssues.push('Course types have not been reviewed, so the course-type checks are incomplete.');
  }

  return (
    <div className="space-y-6 pb-8">
      <Link to="/advisor/requests" className="inline-flex items-center text-sm font-bold text-teal-700 transition hover:text-teal-900">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to course approval
      </Link>

      <section className="glass-card rounded-[2rem] p-6 md:p-8 motion-safe:animate-fade-in-up">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${getRequestStatusClasses(request.status)}`}>
                {request.status.replace('_', ' ')}
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Submitted {formatDisplayDate(request.submittedAt)}</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-800">{request.studentId.name}</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {request.studentProfile?.program || 'Program not available'} · SAP {request.studentId.sapId || 'N/A'} · {request.studentId.email}
            </p>
            {plan?.currentSemester != null ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">Semester {plan.currentSemester}</span>
                {plan.allowedCredits != null ? (
                  <span className={`rounded-full px-3 py-1 ${plan.withinCap === false ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {plan.requestedCredits}/{plan.allowedCredits} credit hours
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Courses" value={String(summary.total)} />
            <StatTile label="Matched" value={`${summary.matched}/${summary.total}`} />
            <StatTile label="Perfect" value={String(summary.perfect)} tone={summary.perfect ? 'text-emerald-600' : 'text-slate-800'} />
            <StatTile label="Decided" value={`${decided}/${summary.total}`} />
          </div>
        </div>
      </section>

      {planIssues.length && !isFinal ? (
        <div className="flex items-start gap-3 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <ul className="space-y-1">
              {planIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            {needsCourseTypeReview ? (
              <Link to="/advisor/applications" className="mt-2 inline-block font-bold text-teal-700 underline">
                Review course types in Applications
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <Notice tone="error">{error}</Notice>
      ) : null}

      <h2 className="text-lg font-bold text-slate-800">Requested courses</h2>

      {activeItem ? (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <CourseRail items={request.items} statusDrafts={statusDrafts} activeId={activeItem._id} onSelect={setSelectedItemId} />
          <CourseDetailPane
            key={activeItem._id}
            item={activeItem}
            position={request.items.findIndex((item) => item._id === activeItem._id) + 1}
            total={request.items.length}
            status={statusDrafts[activeItem._id] ?? activeItem.status}
            comment={commentDrafts[activeItem._id] ?? ''}
            tab={itemTabs[activeItem._id] ?? 'comparison'}
            showOriginalText={showOriginalText}
            loadingActionId={loadingActionId}
            filteredHomeCourses={filteredHomeCourses}
            courseSearch={courseSearch}
            courseLoadError={courseLoadError}
            locked={isFinal}
            onTab={(tab) => setItemTabs((current) => ({ ...current, [activeItem._id]: tab }))}
            onToggleOriginalText={() => setShowOriginalText((current) => !current)}
            onStep={stepCourse}
            onStatus={(status) => setStatusDrafts((current) => ({ ...current, [activeItem._id]: status }))}
            onComment={(value) => setCommentDrafts((current) => ({ ...current, [activeItem._id]: value }))}
            onSearch={setCourseSearch}
            onChangeHome={(homeCourseId) =>
              void runItemAction(
                'pair',
                activeItem._id,
                (token, requestId) => equivalencyApi.updateHomeCourseSelection(token, requestId, activeItem._id, homeCourseId),
                'Unable to update the paired home course.'
              )
            }
            onRerunAuto={() =>
              void runItemAction('auto', activeItem._id, (token, requestId) => equivalencyApi.rerunAutoMatch(token, requestId, activeItem._id), 'Unable to re-run the automatic match.', true)
            }
            onRerunOutline={() =>
              void runItemAction('outline', activeItem._id, (token, requestId) => equivalencyApi.rerunOutlineMatch(token, requestId, activeItem._id), 'Unable to re-run the outline match.', true)
            }
          />
        </div>
      ) : null}

      <section className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 shadow-soft">
        <label htmlFor="overall-comment" className="text-sm font-bold text-slate-700">
          Overall comment to the student <span className="text-xs font-semibold text-slate-500">(optional)</span>
        </label>
        <textarea
          id="overall-comment"
          value={advisorComment}
          onChange={(event) => setAdvisorComment(event.target.value)}
          readOnly={isFinal}
          rows={3}
          className="mt-2 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
          placeholder="Optional note included in the student notification."
        />
      </section>

      <div>
        <div className="glass-card flex flex-col gap-3 rounded-[1.75rem] border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm font-bold text-slate-700">
            <span className="text-emerald-600">{summary.approved} approved</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-red-600">{summary.rejected} rejected</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-slate-500">{summary.total - decided} undecided</span>
          </p>
          {isFinal ? (
            <p className="text-sm font-bold text-slate-600">Decision recorded. It is final and cannot be changed.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={askToConfirmItemDecisions}
                disabled={isSaving}
                className="inline-flex items-center rounded-[1.25rem] bg-dark-blue px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-hover disabled:opacity-60"
              >
                {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Submit final decisions
              </button>
            </div>
          )}
        </div>
      </div>

      {isConfirmingDecision ? (
        <ConfirmDialog
          title="Submit final decisions?"
          message="You are submitting your decision for each course. This is final and cannot be changed afterwards. The student can send a new request for any rejected course."
          confirmLabel="Submit decisions"
          busy={isSaving}
          onConfirm={() => void handleSubmitItemDecisions()}
          onCancel={() => setIsConfirmingDecision(false)}
        />
      ) : null}
    </div>
  );
}
