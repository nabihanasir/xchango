import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  LoaderCircle,
  RefreshCcw,
  Save,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Collapsible, { CollapsePanel } from '../../components/advisor/Collapsible';
import CourseChip from '../../components/advisor/CourseChip';
import EligibilityChecklist from '../../components/advisor/EligibilityChecklist';
import EligibilityPills, { countConcerns } from '../../components/advisor/EligibilityPills';
import ProgramOutlinePanel from '../../components/advisor/ProgramOutlinePanel';
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
  PARTIAL_MATCH_SCORE,
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
const STAGGER_MS = 70;

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

const TopicColumn = ({ title, topics, tone }: { title: string; topics: string[]; tone: string }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {topics.length ? (
        topics.map((topic) => (
          <span key={topic} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
            {topic}
          </span>
        ))
      ) : (
        <span className="text-xs font-medium text-slate-400">None</span>
      )}
    </div>
  </div>
);

interface CourseCardProps {
  item: CourseRequestItem;
  index: number;
  status: ItemStatus;
  comment: string;
  isExpanded: boolean;
  loadingActionId: string;
  filteredHomeCourses: CourseSummary[];
  courseSearch: string;
  courseLoadError: string;
  onToggle: () => void;
  onStatus: (status: ItemStatus) => void;
  onComment: (value: string) => void;
  onSearch: (value: string) => void;
  onChangeHome: (homeCourseId: string) => void;
  onRerunAuto: () => void;
  onRerunOutline: () => void;
}

/** One requested course: a one-line summary that opens into the details. */
function CourseCard({
  item,
  index,
  status,
  comment,
  isExpanded,
  loadingActionId,
  filteredHomeCourses,
  courseSearch,
  courseLoadError,
  onToggle,
  onStatus,
  onComment,
  onSearch,
  onChangeHome,
  onRerunAuto,
  onRerunOutline,
}: CourseCardProps) {
  const basis = getActiveBasis(item);
  const activeMatch = getActiveMatch(item);
  const alternatives = getAlternatives(item);
  const activeStatus = basis === 'outline' ? item.outlineMatchStatus : item.aiMatchStatus;
  const isMatching = activeStatus === 'in_progress';
  const isBusy = loadingActionId.endsWith(`-${item._id}`);
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

  return (
    <article
      style={{ animationDelay: `${index * STAGGER_MS}ms` }}
      className={`rounded-[1.75rem] border border-l-4 border-slate-200 bg-white/90 shadow-soft transition-shadow duration-300 hover:shadow-lg motion-safe:animate-fade-in-up motion-safe:opacity-0 ${
        tier ? tier.accent : 'border-l-slate-300'
      }`}
    >
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.25rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow/60"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
            {index + 1}
          </span>

          <span className="grid min-w-0 flex-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
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
                {activeStatus === 'failed' ? 'No match — open to retry' : 'No home course matched yet'}
              </span>
            )}
          </span>

          {typeof score === 'number' ? <ScoreRing score={score} size={52} /> : null}
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="flex shrink-0 items-center gap-1.5 self-end rounded-full border border-slate-200 bg-slate-50 p-1 lg:self-auto" role="group" aria-label="Course decision">
          {(['approved', 'rejected'] as const).map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => onStatus(status === target ? 'pending' : target)}
              aria-pressed={status === target}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
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
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 pl-[3.75rem] text-xs font-semibold">
        {tier ? (
          <span className={`rounded-full border px-2.5 py-1 ${tier.soft} ${tier.text}`}>{tier.label}</span>
        ) : null}
        {failed ? (
          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700">
            {failed} check{failed > 1 ? 's' : ''} failed
          </span>
        ) : null}
        {warned ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
            {warned} to check
          </span>
        ) : null}
        {tier && !failed && !warned && checks.length ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">All checks passed</span>
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
        {activeMatch?.reasoning ? (
          <span className="min-w-0 basis-full truncate font-medium text-slate-500 sm:basis-auto sm:flex-1">{activeMatch.reasoning.summary}</span>
        ) : null}
        {needsAiMatch ? (
          <button
            type="button"
            onClick={basis === 'outline' ? onRerunOutline : onRerunAuto}
            disabled={isBusy}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-dark-blue px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-navy-hover disabled:opacity-60 motion-safe:animate-pop-in"
          >
            {isBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isBusy ? 'Matching…' : aiMatchLabel}
          </button>
        ) : null}
      </div>

      <CollapsePanel open={isExpanded}>
        <div className="space-y-3 border-t border-slate-100 px-4 py-4">
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
              {activeMatch.reasoning ? (
                <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{activeMatch.reasoning.summary}</p>
              ) : null}
              {checks.length ? (
                <div className="mt-3">
                  <EligibilityPills checks={checks} />
                </div>
              ) : null}
            </div>
          ) : null}

          {checks.length ? (
            <Collapsible title="Eligibility details" summary={failed || warned ? `${failed + warned} to look at` : 'All passed'}>
              <EligibilityChecklist checks={checks} />
            </Collapsible>
          ) : null}

          {activeMatch?.reasoning ? (
            <Collapsible title="Topic comparison">
              <div className="grid gap-4 sm:grid-cols-3">
                <TopicColumn title="Overlapping" topics={activeMatch.reasoning.overlappingTopics} tone="border-emerald-200 bg-emerald-50 text-emerald-700" />
                <TopicColumn title="Missing" topics={activeMatch.reasoning.missingTopics} tone="border-red-200 bg-red-50 text-red-700" />
                <TopicColumn title="Additional" topics={activeMatch.reasoning.additionalTopics} tone="border-sky-200 bg-sky-50 text-sky-700" />
              </div>
              <p className="mt-4 text-sm font-medium leading-6 text-slate-600">
                <span className="font-bold text-slate-700">Credit hours: </span>
                {activeMatch.reasoning.creditHourAssessment}
              </p>
            </Collapsible>
          ) : null}

          {alternatives.length ? (
            <Collapsible title="Other close matches" summary={`${alternatives.length} more`}>
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
                        disabled={isBusy || isMatching}
                        className="shrink-0 rounded-[1rem] border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
                      >
                        Use this instead
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Collapsible>
          ) : null}

          <Collapsible title="Course details">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.1rem] border border-sky-200 bg-sky-50/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700">Host description</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.hostCourseId.description || 'No description provided.'}</p>
              </div>
              <div className="rounded-[1.1rem] border border-violet-200 bg-violet-50/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">Home description</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  {item.homeCourseId?.description || 'No home course matched, or it has no description.'}
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-[1.1rem] border border-slate-200 bg-white p-3">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                <FileText className="h-3.5 w-3.5" />
                Student's course outline
              </p>
              {item.uploadedOutline ? (
                <>
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {item.uploadedOutline.fileUrl ? (
                      <a href={resolveUploadUrl(item.uploadedOutline.fileUrl)} target="_blank" rel="noreferrer" className="font-bold text-emerald-700 underline">
                        {item.uploadedOutline.fileName || 'View uploaded file'}
                      </a>
                    ) : (
                      'Pasted text'
                    )}{' '}
                    · uploaded {formatDisplayDate(item.uploadedOutline.uploadedAt)}
                  </p>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-xs font-bold text-slate-500">Show outline text</summary>
                    <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-[1rem] bg-slate-50 p-3 text-xs font-medium leading-6 text-slate-600">
                      {item.uploadedOutline.text}
                    </p>
                  </details>
                </>
              ) : (
                <p className="mt-2 text-sm font-medium text-slate-400">
                  Not uploaded yet. The student can upload it once their arrival at the host university is recorded.
                </p>
              )}
            </div>
          </Collapsible>

          <Collapsible title="Match scores and re-run" summary={basis === 'outline' ? 'From outline' : 'From description'}>
            <div className="grid gap-3 sm:grid-cols-2">
              <MatchScoreTile label="Description match · preliminary" match={getDescriptionMatch(item)} status={item.aiMatchStatus} isActive={basis === 'description'} emptyText="Not matched yet" />
              <MatchScoreTile label="Outline match · final" match={getOutlineMatch(item)} status={item.outlineMatchStatus} isActive={basis === 'outline'} emptyText="Waiting for the student's outline" />
            </div>
            <div className="mt-3">
              <Button type="button" variant="secondary" onClick={basis === 'outline' ? onRerunOutline : onRerunAuto} disabled={isBusy || isMatching}>
                {isBusy || isMatching ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                {isMatching ? 'Matching…' : basis === 'outline' ? 'Re-run outline match' : 'Re-run auto-match'}
              </Button>
            </div>
            {failures.map((failure) => (
              <div key={failure.key} className="mt-3 rounded-[1.25rem] border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
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
          </Collapsible>

          <Collapsible title="Choose a different home course">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={courseSearch}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Search home courses..."
                className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10 sm:w-2/5"
              />
              <select
                value={item.homeCourseId?._id || ''}
                onChange={(event) => onChangeHome(event.target.value)}
                className="w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10 sm:flex-1"
                disabled={!filteredHomeCourses.length || isBusy}
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
            {courseLoadError ? (
              <p className="mt-2 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{courseLoadError}</p>
            ) : null}
            {!filteredHomeCourses.length && !courseLoadError ? (
              <p className="mt-2 rounded-[1.25rem] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500">
                No home courses available. Contact admin.
              </p>
            ) : null}
            <p className="mt-2 text-xs font-medium text-slate-400">The AI scores the course you pick straight away.</p>
          </Collapsible>

          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor={`comment-${item._id}`}>
              Advisor comment for this course
            </label>
            <textarea
              id={`comment-${item._id}`}
              value={comment}
              onChange={(event) => onComment(event.target.value)}
              rows={2}
              className="mt-2 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
              placeholder="Optional feedback for this specific course pair."
            />
          </div>
        </div>
      </CollapsePanel>
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
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);
  const [loadingActionId, setLoadingActionId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const toggleExpanded = (itemId: string) => {
    setExpandedItemIds((current) =>
      current.includes(itemId) ? current.filter((idValue) => idValue !== itemId) : [...current, itemId]
    );
  };

  const reloadRequest = async () => {
    if (!user?.token || !id) {
      return;
    }

    syncRequestState(await equivalencyApi.getAdvisorRequestById(user.token, id));
  };

  /** Runs one advisor action on a course and shows the updated request. */
  const runItemAction = async (
    actionKey: string,
    itemId: string,
    action: (token: string, requestId: string) => Promise<CourseRequest>,
    failureMessage: string,
    expand = false
  ) => {
    if (!user?.token || !request) {
      return;
    }

    try {
      setLoadingActionId(`${actionKey}-${itemId}`);
      setError('');
      syncRequestState(await action(user.token, request._id));
      if (expand) {
        setExpandedItemIds((current) => (current.includes(itemId) ? current : [...current, itemId]));
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : failureMessage);
    } finally {
      setLoadingActionId('');
    }
  };

  const handleWholeDecision = async (status: 'approved' | 'rejected') => {
    if (!user?.token || !request) {
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      const response = await equivalencyApi.submitAdvisorDecision(user.token, request._id, {
        advisorComment,
        wholeRequestDecision: status,
      });
      syncRequestState(response);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to submit the request decision.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitItemDecisions = async () => {
    if (!user?.token || !request) {
      return;
    }

    const hasPendingDraft = request.items.some((item) => statusDrafts[item._id] === 'pending');
    if (hasPendingDraft) {
      setError('Set every course to approved or rejected before saving the per-course decisions.');
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

  const allExpanded = expandedItemIds.length === request.items.length;
  const decided = summary.approved + summary.rejected;
  const decidedPercent = summary.total ? Math.round((decided / summary.total) * 100) : 0;
  const plan = request.planSummary;

  return (
    <div className="space-y-6 pb-28">
      <Link to="/advisor/requests" className="inline-flex items-center text-sm font-bold text-emerald-700 transition hover:text-emerald-900">
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

        <div className="mt-6">
          <AnimatedBar value={decidedPercent} className="bg-emerald-500" />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-700">Host course</span>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-violet-700">Home course</span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">{PERFECT_MATCH_SCORE}+ perfect match</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
            {PARTIAL_MATCH_SCORE}–{PERFECT_MATCH_SCORE - 1} partial
          </span>
          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700">Under {PARTIAL_MATCH_SCORE} weak</span>
        </div>
      </section>

      <ProgramOutlinePanel studentId={request.studentId._id} summary={request.planSummary} outline={request.programOutline} onSaved={reloadRequest} />

      <Collapsible variant="card" title="Overall comment to the student" summary={advisorComment ? 'Added' : 'Optional'}>
        <textarea
          value={advisorComment}
          onChange={(event) => setAdvisorComment(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
          placeholder="Optional note included in the student notification."
        />
      </Collapsible>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-700 motion-safe:animate-pop-in">{error}</div>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Requested courses</h2>
        <button
          type="button"
          onClick={() => setExpandedItemIds(allExpanded ? [] : request.items.map((item) => item._id))}
          className="text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="space-y-4">
        {request.items.map((item, index) => (
          <CourseCard
            key={item._id}
            item={item}
            index={index}
            status={statusDrafts[item._id] ?? item.status}
            comment={commentDrafts[item._id] ?? ''}
            isExpanded={expandedItemIds.includes(item._id)}
            loadingActionId={loadingActionId}
            filteredHomeCourses={filteredHomeCourses}
            courseSearch={courseSearch}
            courseLoadError={courseLoadError}
            onToggle={() => toggleExpanded(item._id)}
            onStatus={(status) => setStatusDrafts((current) => ({ ...current, [item._id]: status }))}
            onComment={(value) => setCommentDrafts((current) => ({ ...current, [item._id]: value }))}
            onSearch={setCourseSearch}
            onChangeHome={(homeCourseId) =>
              void runItemAction(
                'pair',
                item._id,
                (token, requestId) => equivalencyApi.updateHomeCourseSelection(token, requestId, item._id, homeCourseId),
                'Unable to update the paired home course.'
              )
            }
            onRerunAuto={() =>
              void runItemAction('auto', item._id, (token, requestId) => equivalencyApi.rerunAutoMatch(token, requestId, item._id), 'Unable to re-run the automatic match.', true)
            }
            onRerunOutline={() =>
              void runItemAction('outline', item._id, (token, requestId) => equivalencyApi.rerunOutlineMatch(token, requestId, item._id), 'Unable to re-run the outline match.', true)
            }
          />
        ))}
      </div>

      <div className="sticky bottom-4 z-10">
        <div className="glass-card flex flex-col gap-3 rounded-[1.75rem] border border-slate-200 p-4 shadow-xl lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm font-bold text-slate-700">
            <span className="text-emerald-600">{summary.approved} approved</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-red-600">{summary.rejected} rejected</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-slate-500">{summary.total - decided} undecided</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleWholeDecision('approved')}
              disabled={isSaving}
              className="inline-flex items-center rounded-[1.25rem] bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve all
            </button>
            <button
              type="button"
              onClick={() => void handleWholeDecision('rejected')}
              disabled={isSaving}
              className="inline-flex items-center rounded-[1.25rem] bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject all
            </button>
            <button
              type="button"
              onClick={() => void handleSubmitItemDecisions()}
              disabled={isSaving}
              className="inline-flex items-center rounded-[1.25rem] bg-dark-blue px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-hover disabled:opacity-60"
            >
              {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save per-course decisions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
