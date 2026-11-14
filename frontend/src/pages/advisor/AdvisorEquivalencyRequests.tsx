import { useEffect, useState } from 'react';
import { ArrowRight, ClipboardCheck, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { equivalencyApi } from '../../lib/api';
import type { CourseRequest } from '../../types/equivalency';
import { formatDisplayDate, getRequestStatusClasses } from '../../utils/equivalency';
import Notice from '../../components/Notice';

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

  return (
    <div className="space-y-8">
      {error ? (
        <Notice tone="error">{error}</Notice>
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
                    <span className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.25em] ${getRequestStatusClasses(request.status)}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-600">
                      Updated {formatDisplayDate(request.updatedAt)}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{request.studentId.name}</h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {request.studentProfile?.program || 'Program not available'} · SAP {request.studentId.sapId || 'N/A'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-2">{request.courseCount} courses</span>
                    <span className="rounded-full bg-slate-100 px-3 py-2">{request.studentId.email}</span>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-4 xl:items-end">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-600">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                      <ClipboardCheck className="h-4 w-4" />
                      Review snapshot
                    </div>
                    <p>{request.items.filter((item) => item.aiMatchStatus === 'completed').length} AI matches completed</p>
                    {request.planSummary?.withinCap === false ? (
                      <p className="mt-1 font-bold text-red-600">
                        Over the semester credit limit ({request.planSummary.requestedCredits}/{request.planSummary.allowedCredits})
                      </p>
                    ) : null}
                    {request.planSummary && !request.planSummary.outlineAvailable ? (
                      <p className="mt-1 text-amber-600">No program outline uploaded</p>
                    ) : null}
                    {request.items.some((item) => item.aiMatchStatus === 'in_progress') ? (
                      <p className="mt-1 text-slate-500">
                        {request.items.filter((item) => item.aiMatchStatus === 'in_progress').length} still matching
                      </p>
                    ) : null}
                  </div>

                  <Link
                    to={`/advisor/requests/${request._id}`}
                    className="inline-flex items-center rounded-[1.25rem] bg-teal-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-800"
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
          <h2 className="text-2xl font-bold text-slate-800">No course approval requests yet</h2>
          <p className="mt-3 text-sm font-medium text-slate-500">Requests will appear here as soon as students submit host-course selections.</p>
        </div>
      )}
    </div>
  );
}
