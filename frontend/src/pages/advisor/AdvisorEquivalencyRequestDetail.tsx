import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  RefreshCcw,
  Save,
  XCircle,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { equivalencyApi } from '../../lib/api';
import type { CourseRequest, CourseRequestItem, CourseSummary, ItemStatus } from '../../types/equivalency';
import {
  formatDisplayDate,
  getItemStatusClasses,
  getRequestStatusClasses,
  getScoreBadgeClasses,
  getScoreTrackClasses,
  getUniversityName,
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

export default function AdvisorEquivalencyRequestDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const [request, setRequest] = useState<CourseRequest | null>(null);
  const [homeCourses, setHomeCourses] = useState<CourseSummary[]>([]);
  const [statusDrafts, setStatusDrafts] = useState<StatusDrafts>({});
  const [commentDrafts, setCommentDrafts] = useState<CommentDrafts>({});
  const [advisorComment, setAdvisorComment] = useState('');
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);
  const [loadingActionId, setLoadingActionId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

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

      try {
        setError('');
        const [requestResponse, homeCoursesResponse] = await Promise.all([
          equivalencyApi.getAdvisorRequestById(user.token, id),
          equivalencyApi.getHomeCourses(user.token),
        ]);
        syncRequestState(requestResponse);
        setHomeCourses(homeCoursesResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load this request.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [id, user?.token]);

  const summary = useMemo(
    () => ({
      completedMatches: request?.items.filter((item) => item.aiMatchStatus === 'completed').length || 0,
      approved: Object.values(statusDrafts).filter((status) => status === 'approved').length,
      rejected: Object.values(statusDrafts).filter((status) => status === 'rejected').length,
    }),
    [request?.items, statusDrafts]
  );

  const toggleExpanded = (itemId: string) => {
    setExpandedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((idValue) => idValue !== itemId)
        : [...current, itemId]
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
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update the paired home course.');
    } finally {
      setLoadingActionId('');
    }
  };

  const handleRunMatch = async (itemId: string) => {
    if (!user?.token || !request) {
      return;
    }

    try {
      setLoadingActionId(`match-${itemId}`);
      setError('');
      const response = await equivalencyApi.runCourseMatch(user.token, request._id, itemId);
      syncRequestState(response);
      setExpandedItemIds((current) => (current.includes(itemId) ? current : [...current, itemId]));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to complete the AI match.');
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
      <Link to="/advisor/requests" className="inline-flex items-center text-sm font-bold text-dark-blue transition hover:text-[#120d52]">
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
          const score = item.matchResult?.matchScore ?? 0;

          return (
            <article key={item._id} className="glass-card rounded-[2rem] p-6 md:p-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1 space-y-5">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent-yellow">Host course</p>
                      <h2 className="mt-3 text-xl font-black text-slate-800">
                        {item.hostCourseId.code} · {item.hostCourseId.name}
                      </h2>
                      <p className="mt-3 text-sm font-medium text-slate-500">
                        {getUniversityName(item.hostCourseId.universityId)} · {item.hostCourseId.creditHours} credit hours
                      </p>
                      <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                        {item.hostCourseId.description || 'No description provided for this host course.'}
                      </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Paired home course</p>
                      <select
                        value={item.homeCourseId?._id || ''}
                        onChange={(event) => void handleHomeCourseChange(item._id, event.target.value)}
                        className="mt-3 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
                      >
                        <option value="" disabled>Select a home course</option>
                        {homeCourses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.code} · {course.name}
                          </option>
                        ))}
                      </select>

                      <div className="mt-4 rounded-[1.25rem] bg-slate-50 p-4 text-sm font-medium text-slate-600">
                        {item.homeCourseId ? (
                          <>
                            <p className="font-bold text-slate-700">{item.homeCourseId.name}</p>
                            <p className="mt-1">
                              {getUniversityName(item.homeCourseId.universityId)} · {item.homeCourseId.creditHours} credit hours
                            </p>
                          </>
                        ) : (
                          'Choose the equivalent home course before running the AI review.'
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Course decision</p>
                      <div className="mt-4 grid gap-2">
                        {(['approved', 'rejected', 'pending'] as ItemStatus[]).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setStatusDrafts((current) => ({ ...current, [item._id]: status }))}
                            className={`rounded-[1rem] px-4 py-3 text-left text-sm font-bold capitalize transition ${
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
                        onChange={(event) =>
                          setCommentDrafts((current) => ({ ...current, [item._id]: event.target.value }))
                        }
                        rows={3}
                        className="mt-3 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
                        placeholder="Optional feedback for this specific course pair."
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-[260px] space-y-4">
                  <div className={`rounded-[1.5rem] px-5 py-4 ${item.matchResult ? getScoreBadgeClasses(score) : 'border border-dashed border-slate-300 bg-white text-slate-500'}`}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em]">AI Match Score</p>
                    <p className="mt-3 text-4xl font-black">{item.matchResult ? `${score}/100` : '--'}</p>
                    {item.matchResult ? (
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/60">
                        <div className={`h-full rounded-full ${getScoreTrackClasses(score)}`} style={{ width: `${score}%` }} />
                      </div>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleRunMatch(item._id)}
                    disabled={!item.homeCourseId || loadingActionId === `match-${item._id}` || loadingActionId === `pair-${item._id}`}
                  >
                    {loadingActionId === `match-${item._id}` ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Brain className="mr-2 h-5 w-5" />}
                    Run AI Match
                  </Button>

                  {item.aiMatchStatus === 'failed' ? (
                    <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4" />
                        <div>
                          <p className="font-bold">AI match failed</p>
                          <p className="mt-1">{item.aiMatchError || 'Unknown matching error.'}</p>
                          <button
                            type="button"
                            onClick={() => void handleRunMatch(item._id)}
                            className="mt-3 inline-flex items-center text-sm font-bold text-red-700 underline"
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Retry
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {item.matchResult ? (
                <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(item._id)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">AI Reasoning</p>
                      <p className="mt-2 text-base font-black text-slate-800">{item.matchResult.reasoning.summary}</p>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-slate-500 transition ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded ? (
                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <div className="rounded-[1.25rem] bg-white p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-600">Overlapping topics</p>
                        <ul className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                          {item.matchResult.reasoning.overlappingTopics.map((topic) => (
                            <li key={`${item._id}-overlap-${topic}`}>• {topic}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-[1.25rem] bg-white p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-red-600">Missing topics</p>
                        <ul className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                          {item.matchResult.reasoning.missingTopics.map((topic) => (
                            <li key={`${item._id}-missing-${topic}`}>• {topic}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-[1.25rem] bg-white p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-blue-600">Additional topics</p>
                        <ul className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                          {item.matchResult.reasoning.additionalTopics.map((topic) => (
                            <li key={`${item._id}-additional-${topic}`}>• {topic}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-[1.25rem] bg-white p-4 lg:col-span-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Credit hour assessment</p>
                        <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{item.matchResult.reasoning.creditHourAssessment}</p>
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
              className="inline-flex items-center rounded-[1.25rem] bg-dark-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-[#120d52] disabled:opacity-60"
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
