import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Clock3, LoaderCircle, MessageSquareText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { equivalencyApi } from '../../lib/api';
import type { CourseRequest } from '../../types/equivalency';
import {
  formatDisplayDate,
  getItemStatusClasses,
  getRequestStatusClasses,
  getScoreBadgeClasses,
} from '../../utils/equivalency';

export default function CourseEquivalencyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRequests = async () => {
      if (!user?.token) {
        setIsLoading(false);
        return;
      }

      try {
        setError('');
        const response = await equivalencyApi.getStudentRequests(user.token);
        setRequests(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your requests.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadRequests();
  }, [user?.token]);

  const requestSummary = useMemo(
    () => ({
      pending: requests.filter((request) => request.status === 'pending').length,
      underReview: requests.filter((request) => request.status === 'under_review').length,
      approved: requests.filter((request) => request.status === 'approved').length,
    }),
    [requests]
  );

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-[2.5rem] p-8 md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent-yellow">Student Requests</p>
            <h1 className="mt-3 text-3xl font-black text-slate-800 md:text-4xl">Track your course equivalency reviews</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">
              See each request status, the suggested course pairing, and any advisor feedback after review.
            </p>
          </div>
          <Link
            to="/dashboard/equivalency/courses"
            className="inline-flex items-center justify-center rounded-[1.25rem] bg-dark-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-[#120d52]"
          >
            Submit another request
          </Link>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-[2rem] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Pending</p>
          <p className="mt-3 text-4xl font-black text-slate-800">{requestSummary.pending}</p>
        </div>
        <div className="glass-card rounded-[2rem] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Under Review</p>
          <p className="mt-3 text-4xl font-black text-slate-800">{requestSummary.underReview}</p>
        </div>
        <div className="glass-card rounded-[2rem] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Approved</p>
          <p className="mt-3 text-4xl font-black text-slate-800">{requestSummary.approved}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="glass-card rounded-[2rem] p-8 text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
        </div>
      ) : requests.length ? (
        <div className="space-y-6">
          {requests.map((request) => (
            <section key={request._id} className="glass-card rounded-[2.25rem] p-6 md:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.25em] ${getRequestStatusClasses(request.status)}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                      Submitted {formatDisplayDate(request.submittedAt)}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-slate-800">Request #{request._id.slice(-6).toUpperCase()}</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {request.courseCount} course{request.courseCount === 1 ? '' : 's'} in review
                  </p>
                </div>

                {request.advisorComment ? (
                  <div className="max-w-md rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                      <MessageSquareText className="h-4 w-4" />
                      Advisor comment
                    </div>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{request.advisorComment}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4">
                {request.items.map((item) => (
                  <article key={item._id} className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent-yellow">Host Course</p>
                          <h3 className="mt-2 text-lg font-black text-slate-800">
                            {item.hostCourseId.code} · {item.hostCourseId.name}
                          </h3>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-[1.25rem] bg-slate-50 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Suggested Home Course</p>
                            <p className="mt-2 text-sm font-bold text-slate-700">
                              {item.homeCourseId
                                ? item.homeCourseId.title || item.homeCourseId.name || item.homeCourseId.code
                                : 'Pending advisor pairing'}
                            </p>
                          </div>
                          <div className="rounded-[1.25rem] bg-slate-50 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Course Decision</p>
                            <span className={`mt-2 inline-flex rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.25em] ${getItemStatusClasses(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex min-w-[180px] flex-col gap-3">
                        {item.matchResult ? (
                          <div className={`rounded-[1.25rem] px-4 py-3 text-center ${getScoreBadgeClasses(item.matchResult.matchScore)}`}>
                            <p className="text-[11px] font-bold uppercase tracking-[0.25em]">AI Match Score</p>
                            <p className="mt-2 text-2xl font-black">{item.matchResult.matchScore}/100</p>
                          </div>
                        ) : (
                          <div className="rounded-[1.25rem] border border-dashed border-slate-300 px-4 py-5 text-center text-sm font-medium text-slate-500">
                            AI review not yet completed
                          </div>
                        )}

                        <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4" />
                            Last update {formatDisplayDate(request.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {item.advisorComment ? (
                      <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                          <BookOpenCheck className="h-4 w-4" />
                          Course note
                        </div>
                        {item.advisorComment}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] px-6 py-12 text-center">
          <h2 className="text-2xl font-black text-slate-800">No course requests yet</h2>
          <p className="mt-3 text-sm font-medium text-slate-500">Submit your first host-course selection to start the advisor review workflow.</p>
        </div>
      )}
    </div>
  );
}
