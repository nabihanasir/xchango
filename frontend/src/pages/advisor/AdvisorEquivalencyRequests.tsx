import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ClipboardCheck, LoaderCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { equivalencyApi } from '../../lib/api';
import type { CourseRequest } from '../../types/equivalency';
import { formatDisplayDate, getRequestStatusClasses } from '../../utils/equivalency';

export default function AdvisorEquivalencyRequests() {
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
        const response = await equivalencyApi.getAdvisorRequests(user.token);
        setRequests(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load advisor requests.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadRequests();
  }, [user?.token]);

  const stats = useMemo(
    () => ({
      incoming: requests.filter((request) => request.status === 'pending').length,
      reviewing: requests.filter((request) => request.status === 'under_review').length,
      completed: requests.filter((request) => ['approved', 'rejected'].includes(request.status)).length,
    }),
    [requests]
  );

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#060424] via-[#0b0a4a] to-[#1A1558] p-8 text-white shadow-2xl shadow-dark-blue/20">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-accent-yellow/10 blur-[90px]" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-accent-yellow">
              <Sparkles className="h-4 w-4" />
              Advisor Workflow
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">Course equivalency review queue</h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300">
              Open requests, inspect paired courses, run the AI match manually, and finalize approval or rejection with student-facing comments.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Incoming</p>
              <p className="mt-3 text-3xl font-black">{stats.incoming}</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Reviewing</p>
              <p className="mt-3 text-3xl font-black">{stats.reviewing}</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Completed</p>
              <p className="mt-3 text-3xl font-black">{stats.completed}</p>
            </div>
          </div>
        </div>
      </section>

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
        <div className="space-y-5">
          {requests.map((request) => (
            <article key={request._id} className="glass-card rounded-[2rem] p-6 md:p-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.25em] ${getRequestStatusClasses(request.status)}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                      Updated {formatDisplayDate(request.updatedAt)}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-800">{request.studentId.name}</h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {request.studentProfile?.program || 'Program not available'} · SAP {request.studentId.sapId || 'N/A'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-2">{request.courseCount} courses</span>
                    <span className="rounded-full bg-slate-100 px-3 py-2">{request.studentId.email}</span>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-4 xl:items-end">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-600">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                      <ClipboardCheck className="h-4 w-4" />
                      Review snapshot
                    </div>
                    <p>{request.items.filter((item) => item.aiMatchStatus === 'completed').length} AI matches completed</p>
                  </div>

                  <Link
                    to={`/advisor/requests/${request._id}`}
                    className="inline-flex items-center rounded-[1.25rem] bg-dark-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-[#120d52]"
                  >
                    Open request
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] px-6 py-12 text-center">
          <h2 className="text-2xl font-black text-slate-800">No course equivalency requests yet</h2>
          <p className="mt-3 text-sm font-medium text-slate-500">Requests will appear here as soon as students submit host-course selections.</p>
        </div>
      )}
    </div>
  );
}
