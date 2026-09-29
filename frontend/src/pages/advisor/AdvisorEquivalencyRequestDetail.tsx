import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileText,
  LoaderCircle,
  RefreshCcw,
  Save,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { equivalencyApi } from '../../lib/api';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type {
  AIMatchStatus,
  CourseRequest,
  CourseRequestItem,
  CourseSummary,
  ItemStatus,
  MatchSnapshot,
} from '../../types/equivalency';
import {
  formatDisplayDate,
  getActiveBasis,
  getActiveCandidates,
  getActiveMatch,
  getDescriptionMatch,
  getOutlineMatch,
  getItemStatusClasses,
  getRequestStatusClasses,
  getScoreBadgeClasses,
  getScoreTrackClasses,
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

const getAlternatives = (item: CourseRequestItem) =>
  getActiveCandidates(item)
    .filter((candidate) => candidate.homeCourseId?._id && candidate.homeCourseId._id !== item.homeCourseId?._id)
    .slice(0, MAX_ALTERNATIVES);

const isAdvisorOverride = (item: CourseRequestItem) => {
  const topCandidate = getActiveCandidates(item)[0];
  return Boolean(topCandidate && item.homeCourseId && topCandidate.homeCourseId?._id !== item.homeCourseId._id);
};

interface MatchScoreTileProps {
  label: string;
  match: MatchSnapshot | null;
  status?: AIMatchStatus;
  isActive: boolean;
  emptyText: string;
}

/** One of the two match scores: from the catalogue description (preliminary) or the uploaded outline (final). */
function MatchScoreTile({ label, match, status, isActive, emptyText }: MatchScoreTileProps) {
  const score = match?.matchScore ?? 0;

  return (
    <div
      className={`rounded-[1.25rem] px-4 py-3 ${
        match ? getScoreBadgeClasses(score) : 'border border-dashed border-slate-300 bg-white text-slate-500'
      } ${isActive ? 'ring-2 ring-accent-yellow/40' : 'opacity-80'}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</p>
      {status === 'in_progress' ? (
        <p className="mt-2 flex items-center gap-2 text-sm font-bold">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Matching…
        </p>
      ) : match ? (
        <>
          <p className="mt-1 text-2xl font-black">{score}/100</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60">
            <div className={`h-full rounded-full ${getScoreTrackClasses(score)}`} style={{ width: `${score}%` }} />
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs font-medium">{status === 'failed' ? 'Match failed' : emptyText}</p>
      )}
    </div>
  );
}

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
  const [overrideItemIds, setOverrideItemIds] = useState<string[]>([]);
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

  const summary = useMemo(
    () => ({
      completedMatches: request?.items.filter((item) => item.aiMatchStatus === 'completed').length || 0,
      approved: Object.values(statusDrafts).filter((status) => status === 'approved').length,
      rejected: Object.values(statusDrafts).filter((status) => status === 'rejected').length,
    }),
    [request?.items, statusDrafts]
  );

  const toggleOverride = (itemId: string) => {
    setOverrideItemIds((current) =>
      current.includes(itemId) ? current.filter((idValue) => idValue !== itemId) : [...current, itemId]
    );
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItemIds((current) =>
      current.includes(itemId) ? current.filter((idValue) => idValue !== itemId) : [...current, itemId]
    );
  };

  const handleHomeCourseChange = async (itemId: string, homeCourseId: string) => {
    if (!user?.token || !request) {
      return;
    }

    try {
      setLoadingActionId(`pair-${itemId}`);
      setError('');
      const response = await equivalencyApi.updateHomeCourseSelection(user.token, request._id, itemId, homeCourseId);
      syncRequestState(response);
      setOverrideItemIds((current) => current.filter((idValue) => idValue !== itemId));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update the paired home course.');
    } finally {
      setLoadingActionId('');
    }
  };

  const handleRerunAutoMatch = async (itemId: string) => {
    if (!user?.token || !request) {
      return;
    }

    try {
      setLoadingActionId(`auto-${itemId}`);
      setError('');
      const response = await equivalencyApi.rerunAutoMatch(user.token, request._id, itemId);
      syncRequestState(response);
      setExpandedItemIds((current) => (current.includes(itemId) ? current : [...current, itemId]));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to re-run the automatic match.');
    } finally {
      setLoadingActionId('');
    }
  };

  const handleRerunOutlineMatch = async (itemId: string) => {
    if (!user?.token || !request) {
      return;
    }

    try {
      setLoadingActionId(`outline-${itemId}`);
      setError('');
      const response = await equivalencyApi.rerunOutlineMatch(user.token, request._id, itemId);
      syncRequestState(response);
      setExpandedItemIds((current) => (current.includes(itemId) ? current : [...current, itemId]));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to re-run the outline match.');
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
      setError('Set every course to approved or rejected before submitting item-level decisions.');
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
        <h2 className="text-2xl font-black text-slate-800">Request not found</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link to="/advisor/requests" className="inline-flex items-center text-sm font-bold text-emerald-700 transition hover:text-emerald-900">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to advisor queue
      </Link>

      <section className="glass-card rounded-[2.5rem] p-8 md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.25em] ${getRequestStatusClasses(request.status)}`}>
                {request.status.replace('_', ' ')}
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                Submitted {formatDisplayDate(request.submittedAt)}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black text-slate-800 md:text-4xl">{request.studentId.name}</h1>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
              {request.studentProfile?.program || 'Program not available'} · SAP {request.studentId.sapId || 'N/A'} · {request.studentId.email}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-[1.75rem] bg-slate-50 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Courses</p>
              <p className="mt-3 text-3xl font-black text-slate-800">{request.courseCount}</p>
            </div>
            <div className="rounded-[1.75rem] bg-slate-50 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Matches</p>
              <p className="mt-3 text-3xl font-black text-slate-800">{summary.completedMatches}</p>
            </div>
            <div className="rounded-[1.75rem] bg-slate-50 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Decisions</p>
              <p className="mt-3 text-3xl font-black text-slate-800">{summary.approved + summary.rejected}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Overall advisor comment</label>
          <textarea
            value={advisorComment}
            onChange={(event) => setAdvisorComment(event.target.value)}
            rows={3}
            className="mt-3 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
            placeholder="Optional note included in the student notification."
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-6">
        {request.items.map((item) => {
          const isExpanded = expandedItemIds.includes(item._id);
          const basis = getActiveBasis(item);
          const activeMatch = getActiveMatch(item);
          const alternatives = getAlternatives(item);
          const activeStatus = basis === 'outline' ? item.outlineMatchStatus : item.aiMatchStatus;
          const isMatching = activeStatus === 'in_progress';
          const failures = [
            item.aiMatchStatus === 'failed'
              ? { key: 'description', label: 'Description match failed', error: item.aiMatchError, retry: handleRerunAutoMatch }
              : null,
            item.outlineMatchStatus === 'failed'
              ? { key: 'outline', label: 'Outline match failed', error: item.outlineMatchError, retry: handleRerunOutlineMatch }
              : null,
          ].filter((failure) => failure !== null);
          const isOverrideOpen = overrideItemIds.includes(item._id);
          const isBusy = loadingActionId.endsWith(`-${item._id}`);

          return (
            <article key={item._id} className="glass-card rounded-[2rem] p-6 md:p-7 space-y-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent-yellow">Host course</p>
                  <h2 className="mt-3 text-xs font-bold text-slate-800">
                    {item.hostCourseId.code} · {getCourseTitle(item.hostCourseId)}
                  </h2>
                  <p className="mt-3 text-sm font-medium text-slate-500">
                    {item.hostCourseId.creditHours} credit hours
                  </p>
                  <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                    {item.hostCourseId.description || 'No description provided for this host course.'}
                  </p>

                  <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                      <FileText className="h-4 w-4" />
                      Student's course outline
                    </p>
                    {item.uploadedOutline ? (
                      <>
                        <p className="mt-2 text-sm font-medium text-slate-600">
                          {item.uploadedOutline.fileUrl ? (
                            <a
                              href={resolveUploadUrl(item.uploadedOutline.fileUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-emerald-700 underline"
                            >
                              {item.uploadedOutline.fileName || 'View uploaded file'}
                            </a>
                          ) : (
                            'Pasted text'
                          )}{' '}
                          · uploaded {formatDisplayDate(item.uploadedOutline.uploadedAt)}
                        </p>
                        <details className="mt-2 text-sm">
                          <summary className="cursor-pointer text-xs font-bold text-slate-500">Show outline text</summary>
                          <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-[1rem] bg-white p-3 text-xs font-medium leading-6 text-slate-600">
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
                </div>

                <div className="flex flex-col rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent-yellow">
                      {isAdvisorOverride(item)
                        ? 'Advisor-selected home course'
                        : basis === 'outline'
                          ? 'Matched from uploaded outline'
                          : 'AI-matched home course · preliminary'}
                    </p>
                    {activeMatch?.matchedBy === 'heuristic' ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">
                        Keyword estimate · no LLM configured
                      </span>
                    ) : null}
                  </div>

                  {isMatching ? (
                    <div className="mt-3 flex items-center gap-3 rounded-[1.25rem] border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-500">
                      <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-accent-yellow" />
                      {basis === 'outline'
                        ? "Comparing the student's uploaded outline with the home course catalogue…"
                        : 'Comparing the catalogue description with the home course catalogue…'}
                    </div>
                  ) : item.homeCourseId ? (
                    <>
                      <h2 className="mt-3 text-xs font-bold text-slate-800">{getCourseTitle(item.homeCourseId)}</h2>
                      <p className="mt-3 text-sm font-medium text-slate-500">
                        {item.homeCourseId.creditHours} credit hours
                      </p>
                      <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                        {item.homeCourseId.description || 'No description provided for this home course.'}
                      </p>
                    </>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-slate-400">
                      {activeStatus === 'failed'
                        ? 'No home course could be matched automatically. Re-run the match or choose one below.'
                        : 'No home course has been matched yet.'}
                    </p>
                  )}

                  {alternatives.length ? (
                    <div className="mt-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Other close matches</p>
                      <ul className="mt-3 space-y-2">
                        {alternatives.map((candidate) => (
                          <li
                            key={`${item._id}-candidate-${candidate.homeCourseId._id}`}
                            className="flex flex-col gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center"
                          >
                            <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-black ${getScoreBadgeClasses(candidate.matchScore)}`}>
                              {candidate.matchScore}/100
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-700">
                                {getCourseTitle(candidate.homeCourseId)} · {candidate.homeCourseId.creditHours} CH
                              </p>
                              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{candidate.reasoning.summary}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleHomeCourseChange(item._id, candidate.homeCourseId._id)}
                              disabled={isBusy || isMatching}
                              className="shrink-0 rounded-[1rem] border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 disabled:opacity-60"
                            >
                              Use this instead
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => toggleOverride(item._id)}
                    disabled={isMatching}
                    className="mt-4 inline-flex w-fit items-center text-xs font-bold text-emerald-700 transition hover:text-emerald-900 disabled:opacity-60"
                  >
                    Choose a different home course
                    <ChevronDown className={`ml-1 h-4 w-4 transition ${isOverrideOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOverrideOpen ? (
                    <>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          value={courseSearch}
                          onChange={(event) => setCourseSearch(event.target.value)}
                          placeholder="Search home courses..."
                          className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10 sm:w-2/5"
                        />

                        <select
                          value={item.homeCourseId?._id || ''}
                          onChange={(event) => void handleHomeCourseChange(item._id, event.target.value)}
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
                        <div className="mt-2 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                          {courseLoadError}
                        </div>
                      ) : null}

                      {!filteredHomeCourses.length && !courseLoadError ? (
                        <div className="mt-2 rounded-[1.25rem] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500">
                          No home courses available. Contact admin.
                        </div>
                      ) : null}

                      <p className="mt-2 text-xs font-medium text-slate-400">The AI scores the course you pick straight away.</p>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="flex flex-col gap-3">
                  <MatchScoreTile
                    label="Description match · preliminary"
                    match={getDescriptionMatch(item)}
                    status={item.aiMatchStatus}
                    isActive={basis === 'description'}
                    emptyText="Not matched yet"
                  />
                  <MatchScoreTile
                    label="Outline match · final"
                    match={getOutlineMatch(item)}
                    status={item.outlineMatchStatus}
                    isActive={basis === 'outline'}
                    emptyText="Waiting for the student's outline"
                  />

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void (basis === 'outline' ? handleRerunOutlineMatch(item._id) : handleRerunAutoMatch(item._id))}
                    disabled={isBusy || isMatching}
                  >
                    {isBusy || isMatching ? (
                      <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-5 w-5" />
                    )}
                    {isMatching ? 'Matching…' : basis === 'outline' ? 'Re-run outline match' : 'Re-run auto-match'}
                  </Button>

                  {failures.map((failure) => (
                    <div key={failure.key} className="rounded-[1.25rem] border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="font-bold">{failure.label}</p>
                          <p className="mt-1">{failure.error || 'Unknown matching error.'}</p>
                          <button
                            type="button"
                            onClick={() => void failure.retry(item._id)}
                            disabled={isBusy}
                            className="mt-2 inline-flex items-center font-bold text-red-700 underline"
                          >
                            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                            Retry
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Course decision</p>
                    <div className="mt-3 flex gap-2">
                      {(['approved', 'rejected', 'pending'] as ItemStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatusDrafts((current) => ({ ...current, [item._id]: status }))}
                          className={`flex-1 rounded-[1rem] px-3 py-2.5 text-center text-sm font-bold capitalize transition ${
                            statusDrafts[item._id] === status
                              ? getItemStatusClasses(status)
                              : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Per-course advisor comment</label>
                    <textarea
                      value={commentDrafts[item._id] || ''}
                      onChange={(event) => setCommentDrafts((current) => ({ ...current, [item._id]: event.target.value }))}
                      rows={2}
                      className="mt-3 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
                      placeholder="Optional feedback for this specific course pair."
                    />
                  </div>
                </div>
              </div>

              {activeMatch?.reasoning ? (
                <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(item._id)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent-yellow">
                        AI Reasoning · {basis === 'outline' ? 'from uploaded outline' : 'from catalogue description'}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-800">{activeMatch.reasoning.summary}</p>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-slate-500 transition ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded ? (
                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <div className="rounded-[1.25rem] bg-white p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-600">Overlapping topics</p>
                        <ul className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                          {activeMatch.reasoning.overlappingTopics.map((topic) => (
                            <li key={`${item._id}-overlap-${topic}`}>• {topic}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-[1.25rem] bg-white p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-red-600">Missing topics</p>
                        <ul className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                          {activeMatch.reasoning.missingTopics.map((topic) => (
                            <li key={`${item._id}-missing-${topic}`}>• {topic}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-[1.25rem] bg-white p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-blue-600">Additional topics</p>
                        <ul className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                          {activeMatch.reasoning.additionalTopics.map((topic) => (
                            <li key={`${item._id}-additional-${topic}`}>• {topic}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-[1.25rem] bg-white p-4 lg:col-span-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Credit hour assessment</p>
                        <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{activeMatch.reasoning.creditHourAssessment}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <section className="glass-card rounded-[2rem] p-6 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Submit the advisor decision</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Use approve or reject for the full request, or save the item-level decisions you drafted above.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleWholeDecision('approved')}
              disabled={isSaving}
              className="inline-flex items-center rounded-[1.25rem] bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve all
            </button>
            <button
              type="button"
              onClick={() => void handleWholeDecision('rejected')}
              disabled={isSaving}
              className="inline-flex items-center rounded-[1.25rem] bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject all
            </button>
            <button
              type="button"
              onClick={() => void handleSubmitItemDecisions()}
              disabled={isSaving}
              className="inline-flex items-center rounded-[1.25rem] bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save per-course decisions
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
