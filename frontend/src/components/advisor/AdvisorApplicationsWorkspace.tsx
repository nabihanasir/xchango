import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Eye,
  FileText,
  GraduationCap,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { applicationApi } from '../../lib/applicationApi';
import { resolveUploadUrl, studentProfileApi } from '../../lib/studentProfileApi';
import {
  applicationStatusTone,
  getApplicationCourseId,
  getApplicationCourseLabel,
  getApplicationCourseSummary,
  getApplicationCourseUniversity,
  getApplicationUserId,
  getApplicationUserSummary,
  type SelectedCourseStatus,
  type WorkflowApplication,
} from '../../types/application';
import type { StudentProfile } from '../../types/studentProfile';

const formatStatus = (status: string) =>
  status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const SummaryCard = ({ title, value }: { title: string; value: string }) => (
  <div className="glass-card rounded-[2rem] p-6">
    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">{title}</p>
    <p className="mt-3 text-4xl font-black text-dark-blue">{value}</p>
  </div>
);

const selectedCourseTone: Record<SelectedCourseStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export default function AdvisorApplicationsWorkspace({
  showHero = false,
}: {
  showHero?: boolean;
}) {
  const { user } = useAuth();
  const applicationRef = useRef<HTMLElement | null>(null);
  const studentRef = useRef<HTMLElement | null>(null);

  const [applications, setApplications] = useState<WorkflowApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<WorkflowApplication | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [courseCommentDrafts, setCourseCommentDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [actionError, setActionError] = useState('');
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [activeCourseDecision, setActiveCourseDecision] = useState('');
  const [interviewForm, setInterviewForm] = useState({ date: '', location: 'Advisor Office' });
  const [schedulingInterview, setSchedulingInterview] = useState(false);
  const [completingInterview, setCompletingInterview] = useState(false);

  const stats = useMemo(() => {
    const pending = applications.filter((item) =>
      ['ASSIGNED', 'INTERVIEW_SCHEDULED'].includes(item.status)
    ).length;
    const shortlisted = applications.filter((item) => item.status === 'SHORTLISTED').length;
    const rejected = applications.filter((item) => item.status === 'REJECTED').length;

    return { pending, shortlisted, rejected };
  }, [applications]);

  const aiRecommendationIds = useMemo(
    () =>
      new Set(
        (selectedApplication?.aiRecommendations || [])
          .map((recommendation) => getApplicationCourseId(recommendation.course))
          .filter(Boolean)
      ),
    [selectedApplication?.aiRecommendations]
  );

  useEffect(() => {
    let cancelled = false;

    const loadApplications = async () => {
      setLoading(true);
      setPageError('');

      try {
        const data = await applicationApi.getAdvisorApplications();
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setApplications(data);
          setSelectedApplicationId((current) =>
            current && data.some((application) => application._id === current)
              ? current
              : data[0]?._id || ''
          );
        });
      } catch (error) {
        if (!cancelled) {
          setPageError(error instanceof Error ? error.message : 'Unable to load assigned applications.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadApplications();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedApplicationId) {
      setSelectedApplication(null);
      setStudentProfile(null);
      setCourseCommentDrafts({});
      setDetailsError('');
      return;
    }

    let cancelled = false;

    const loadDetails = async () => {
      setDetailsLoading(true);
      setDetailsError('');

      try {
        const application = await applicationApi.getApplication(selectedApplicationId);
        const studentId = getApplicationUserId(application.studentId);

        if (!studentId) {
          throw new Error('Student record could not be resolved for this application.');
        }

        const [profile, aiRecommendations] = await Promise.all([
          studentProfileApi.getStudentProfile(studentId),
          applicationApi.getAiRecommendations(selectedApplicationId),
        ]);

        if (cancelled) {
          return;
        }

        const hydratedApplication = {
          ...application,
          aiRecommendations,
        };

        startTransition(() => {
          setSelectedApplication(hydratedApplication);
          setStudentProfile(profile);
          setCourseCommentDrafts(
            Object.fromEntries(
              hydratedApplication.selectedCourses.map((course) => [
                getApplicationCourseId(course.course),
                course.advisorComment || '',
              ])
            )
          );
        });
      } catch (error) {
        if (!cancelled) {
          setDetailsError(error instanceof Error ? error.message : 'Unable to load application details.');
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }
    };

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedApplicationId]);

  useEffect(() => {
    if (!selectedApplication) {
      setInterviewForm({ date: '', location: 'Advisor Office' });
      return;
    }

    setInterviewForm({
      date: selectedApplication.interviewDate
        ? new Date(selectedApplication.interviewDate).toISOString().slice(0, 10)
        : selectedApplication.interview?.date
          ? new Date(selectedApplication.interview.date).toISOString().slice(0, 10)
          : '',
      location: selectedApplication.interview?.location || 'Advisor Office',
    });
  }, [selectedApplication]);

  const syncApplication = (updatedApplication: WorkflowApplication) => {
    setApplications((current) =>
      current.map((application) =>
        application._id === updatedApplication._id ? updatedApplication : application
      )
    );
    setSelectedApplication(updatedApplication);
    setCourseCommentDrafts(
      Object.fromEntries(
        updatedApplication.selectedCourses.map((course) => [
          getApplicationCourseId(course.course),
          course.advisorComment || '',
        ])
      )
    );
  };

  const handleOpen = (applicationId: string, target: 'application' | 'student') => {
    setSelectedApplicationId(applicationId);
    (target === 'student' ? studentRef.current : applicationRef.current)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleGenerateSuggestions = async () => {
    if (!selectedApplicationId) {
      return;
    }

    setGeneratingSuggestions(true);
    setActionError('');

    try {
      const updatedApplication = await applicationApi.generateAiRecommendations(selectedApplicationId);
      syncApplication(updatedApplication);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to generate AI suggestions.');
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const handleCourseDecision = async (
    courseId: string,
    status: Exclude<SelectedCourseStatus, 'pending'>
  ) => {
    if (!selectedApplicationId) {
      return;
    }

    setActiveCourseDecision(`${courseId}-${status}`);
    setActionError('');

    try {
      const updatedApplication = await applicationApi.updateCourseDecision(selectedApplicationId, {
        courseId,
        status,
        advisorComment: courseCommentDrafts[courseId] || '',
      });
      syncApplication(updatedApplication);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update course decision.');
    } finally {
      setActiveCourseDecision('');
    }
  };

  const handleScheduleInterview = async () => {
    if (!selectedApplicationId || !interviewForm.date.trim()) {
      setActionError('Select an interview date before scheduling.');
      return;
    }

    setSchedulingInterview(true);
    setActionError('');

    try {
      const updatedApplication = await applicationApi.scheduleInterview(selectedApplicationId, {
        date: interviewForm.date,
        location: interviewForm.location.trim() || 'Advisor Office',
        stakeholders: user?._id ? [user._id] : [],
      });
      syncApplication(updatedApplication);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to schedule interview.');
    } finally {
      setSchedulingInterview(false);
    }
  };

  const handleCompleteInterview = async () => {
    if (!selectedApplicationId) {
      return;
    }

    setCompletingInterview(true);
    setActionError('');

    try {
      const updatedApplication = await applicationApi.completeInterview(selectedApplicationId);
      syncApplication(updatedApplication);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to complete interview.');
    } finally {
      setCompletingInterview(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-medium text-slate-500 shadow-sm">
        Sign in as an advisor to access assigned applications.
      </div>
    );
  }

  const selectedStudent = getApplicationUserSummary(selectedApplication?.studentId);

  return (
    <div className="space-y-6">
      {showHero ? (
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#081028] via-[#102b52] to-[#19648b] p-8 text-white shadow-2xl shadow-sky-950/10 md:p-10">
          <div className="absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/3 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 -translate-x-1/4 translate-y-1/4 rounded-full bg-accent-yellow/20 blur-3xl" />
          <div className="relative z-10 max-w-4xl">
            <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.35em] text-accent-yellow">
              Advisor Review Queue
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              Review assigned applications and AI-assisted course recommendations.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
              AI suggests course matches and reasons, but the final approval or rejection remains with the advisor.
            </p>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Assigned Applications" value={String(applications.length)} />
        <SummaryCard title="Pending Interview" value={String(stats.pending)} />
        <SummaryCard title="Shortlisted / Rejected" value={`${stats.shortlisted} / ${stats.rejected}`} />
      </div>

      {pageError ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-sm font-medium text-red-700">
          {pageError}
        </div>
      ) : null}

      <section className="glass-card overflow-hidden rounded-[2rem]">
        <div className="border-b border-slate-200/80 px-6 py-6">
          <h2 className="text-2xl font-black text-slate-900">Assigned Applications</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Review application status first, then use AI suggestions as decision support for course approvals.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm font-medium text-slate-500">
            No applications are assigned to you yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.25em] text-slate-500">Student</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.25em] text-slate-500">Country</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.25em] text-slate-500">University</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.25em] text-slate-500">Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.25em] text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {applications.map((application) => {
                  const student = getApplicationUserSummary(application.studentId);

                  return (
                    <tr
                      key={application._id}
                      className={
                        application._id === selectedApplicationId
                          ? 'bg-sky-50/60'
                          : 'hover:bg-slate-50/70'
                      }
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{student?.name || 'Student record'}</p>
                        <p className="mt-1 text-sm text-slate-500">{student?.email || 'Email unavailable'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{application.country}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{application.university}</p>
                        <p className="mt-1 text-sm text-slate-500">{application.program}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${applicationStatusTone[application.status]}`}
                        >
                          {formatStatus(application.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpen(application._id, 'application')}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition hover:border-dark-blue hover:text-dark-blue"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Application</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpen(application._id, 'student')}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition hover:border-dark-blue hover:text-dark-blue"
                          >
                            <UserRound className="h-3.5 w-3.5" />
                            <span>View Student Profile</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailsError ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-sm font-medium text-red-700">
          {detailsError}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-sm font-medium text-red-700">
          {actionError}
        </div>
      ) : null}

      <section ref={applicationRef} className="glass-card rounded-[2rem] p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Application Details</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Review assigned students, schedule interviews, and unlock course approval after completion.
            </p>
          </div>
          {selectedApplication ? (
            <button
              type="button"
              onClick={() => void handleGenerateSuggestions()}
              disabled={generatingSuggestions}
              className="inline-flex items-center gap-2 rounded-full bg-dark-blue px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#0f1f48] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              <span>{generatingSuggestions ? 'Generating...' : 'Generate AI Suggestions'}</span>
            </button>
          ) : null}
        </div>
        {detailsLoading ? (
          <div className="mt-6 h-48 animate-pulse rounded-2xl bg-slate-100" />
        ) : selectedApplication ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded-[1.75rem] border border-slate-200 p-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Application summary
                  </p>
                  <h3 className="mt-3 text-2xl font-black text-slate-900">{selectedApplication.university}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">{selectedApplication.program}</p>
                </div>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Country:</span> {selectedApplication.country}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Registration number:</span> {selectedApplication.registrationNumber || 'Pending'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Passport valid:</span> {selectedApplication.passportValid ? 'Yes' : 'No'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Financially eligible:</span> {selectedApplication.financialEligible ? 'Yes' : 'Flagged for review'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Travel history:</span> {selectedApplication.travelHistory.hasTravelHistory ? selectedApplication.travelHistory.details || 'Declared' : 'No'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Medical condition:</span> {selectedApplication.medicalCondition.hasCondition ? selectedApplication.medicalCondition.details || 'Declared' : 'No'}</p>
              </div>

              <div className="space-y-4 rounded-[1.75rem] border border-slate-200 p-6">
                <div className="inline-flex rounded-full bg-dark-blue px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                  {formatStatus(selectedApplication.status)}
                </div>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Student:</span> {selectedStudent?.name || 'Student record'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Email:</span> {selectedStudent?.email || 'Email unavailable'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Documents:</span> {selectedApplication.documents.length}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Selected courses:</span> {selectedApplication.selectedCourses.length}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">AI suggestions:</span> {selectedApplication.aiRecommendations.length}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Interview date:</span> {selectedApplication.interviewDate ? new Date(selectedApplication.interviewDate).toLocaleDateString() : selectedApplication.interview ? new Date(selectedApplication.interview.date).toLocaleDateString() : 'Not scheduled'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Interview location:</span> {selectedApplication.interview?.location || 'Not scheduled'}</p>
                <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Interview Scheduler
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      <span>Interview date</span>
                      <input
                        type="date"
                        value={interviewForm.date}
                        onChange={(event) =>
                          setInterviewForm((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      <span>Location</span>
                      <input
                        type="text"
                        value={interviewForm.location}
                        onChange={(event) =>
                          setInterviewForm((current) => ({
                            ...current,
                            location: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10"
                        placeholder="Advisor office or meeting link"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleScheduleInterview()}
                      disabled={
                        schedulingInterview ||
                        !['ASSIGNED', 'INTERVIEW_SCHEDULED'].includes(selectedApplication.status)
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-dark-blue px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#0f1f48] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>{schedulingInterview ? 'Saving...' : 'Schedule Interview'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCompleteInterview()}
                      disabled={
                        completingInterview || selectedApplication.status !== 'INTERVIEW_SCHEDULED'
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      <span>
                        {completingInterview ? 'Completing...' : 'Mark Interview Completed'}
                      </span>
                    </button>
                  </div>
                  {selectedApplication.status === 'INTERVIEW_COMPLETED' ? (
                    <p className="text-sm font-semibold text-emerald-700">
                      Interview completed. The student can now request course approval.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">AI Recommendation Panel</h3>
                  <p className="mt-2 max-w-3xl text-sm text-slate-600">
                    The AI scores available courses against the student profile and explains why. It does not approve anything.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                  Advisor remains final decision-maker
                </div>
              </div>

              {selectedApplication.aiRecommendations.length ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {selectedApplication.aiRecommendations.map((recommendation) => {
                    const courseId = getApplicationCourseId(recommendation.course);
                    const isSelectedByStudent = selectedApplication.selectedCourses.some(
                      (course) => getApplicationCourseId(course.course) === courseId
                    );

                    return (
                      <article key={recommendation._id || courseId} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-900">
                              {getApplicationCourseLabel(recommendation.course)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {getApplicationCourseUniversity(recommendation.course) || 'University not linked'}
                            </p>
                          </div>
                          <span className="rounded-full bg-dark-blue px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                            {recommendation.matchScore}% match
                          </span>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-600">{recommendation.reason}</p>
                        <div className="mt-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${
                              isSelectedByStudent
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {isSelectedByStudent ? 'Also selected by student' : 'AI-only suggestion'}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm font-medium text-slate-500">
                  No AI suggestions generated yet for this application.
                </div>
              )}
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-[1.75rem] border border-slate-200 p-6">
                <h3 className="text-xl font-black text-slate-900">Student Selected Courses</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Approve or reject each selected course after comparing it with AI suggestions.
                </p>

                <div className="mt-5 space-y-4">
                  {selectedApplication.selectedCourses.length ? (
                    selectedApplication.selectedCourses.map((selectedCourse) => {
                      const courseId = getApplicationCourseId(selectedCourse.course);
                      const summary = getApplicationCourseSummary(selectedCourse.course);
                      const isAiRecommended = aiRecommendationIds.has(courseId);

                      return (
                        <article key={selectedCourse._id || courseId} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-black text-slate-900">
                                {getApplicationCourseLabel(selectedCourse.course)}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {getApplicationCourseUniversity(selectedCourse.course) || 'University not linked'}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${selectedCourseTone[selectedCourse.status]}`}
                              >
                                {selectedCourse.status}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                                  isAiRecommended
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {isAiRecommended ? 'AI recommended' : 'Not recommended by AI'}
                              </span>
                            </div>
                          </div>
                          <p className="mt-4 text-sm text-slate-600">
                            {summary?.description || 'No course description is available for this selection.'}
                          </p>
                          <textarea
                            value={courseCommentDrafts[courseId] || ''}
                            onChange={(event) =>
                              setCourseCommentDrafts((current) => ({
                                ...current,
                                [courseId]: event.target.value,
                              }))
                            }
                            placeholder="Add advisor rationale for this course decision"
                            className="mt-4 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10"
                          />
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => void handleCourseDecision(courseId, 'approved')}
                              disabled={activeCourseDecision.length > 0}
                              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>
                                {activeCourseDecision === `${courseId}-approved`
                                  ? 'Saving...'
                                  : 'Approve Course'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCourseDecision(courseId, 'rejected')}
                              disabled={activeCourseDecision.length > 0}
                              className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>
                                {activeCourseDecision === `${courseId}-rejected`
                                  ? 'Saving...'
                                  : 'Reject Course'}
                              </span>
                            </button>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-8 text-sm font-medium text-slate-500">
                      The student has not selected any courses yet.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-slate-200 p-6">
                <h3 className="text-xl font-black text-slate-900">Comparison View</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Compare student-selected courses with AI-suggested courses before recording a decision.
                </p>

                <div className="mt-5 space-y-4">
                  {selectedApplication.aiRecommendations.length ? (
                    selectedApplication.aiRecommendations.map((recommendation) => {
                      const courseId = getApplicationCourseId(recommendation.course);
                      const selectedMatch = selectedApplication.selectedCourses.find(
                        (course) => getApplicationCourseId(course.course) === courseId
                      );

                      return (
                        <article key={recommendation._id || courseId} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-black text-slate-900">
                                {getApplicationCourseLabel(recommendation.course)}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {getApplicationCourseUniversity(recommendation.course) || 'University not linked'}
                              </p>
                            </div>
                            <span className="rounded-full bg-dark-blue px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                              {recommendation.matchScore}%
                            </span>
                          </div>
                          <p className="mt-4 text-sm text-slate-600">{recommendation.reason}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                                selectedMatch
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {selectedMatch ? 'Chosen by student' : 'Not chosen by student'}
                            </span>
                            {selectedMatch ? (
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${selectedCourseTone[selectedMatch.status]}`}
                              >
                                Advisor status: {selectedMatch.status}
                              </span>
                            ) : null}
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-8 text-sm font-medium text-slate-500">
                      Generate AI suggestions to unlock the comparison view.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm font-medium text-slate-500">
            Select an assigned application to inspect its details.
          </div>
        )}
      </section>

      <section ref={studentRef} className="glass-card rounded-[2rem] p-6 lg:p-8">
        <h2 className="text-2xl font-black text-slate-900">Student Profile View</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Loaded only for the student linked to the selected assigned application.
        </p>

        {detailsLoading ? (
          <div className="mt-6 h-48 animate-pulse rounded-2xl bg-slate-100" />
        ) : studentProfile ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="space-y-4 rounded-[1.75rem] border border-slate-200 p-6">
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <GraduationCap className="h-5 w-5 text-sky-600" />
                <span>Basic and academic profile</span>
              </h3>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Full name:</span> {studentProfile.basicInfo.fullName || selectedStudent?.name || 'N/A'}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Email:</span> {studentProfile.basicInfo.email || selectedStudent?.email || 'N/A'}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Phone:</span> {studentProfile.basicInfo.phone || selectedStudent?.phone || 'N/A'}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Department:</span> {studentProfile.basicInfo.department || 'N/A'}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Semester:</span> {studentProfile.basicInfo.semester || 'N/A'}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">CGPA:</span> {studentProfile.transcript.cgpa.toFixed(2)}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Field of interest:</span> {studentProfile.preferences.fieldOfInterest || 'Not provided'}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Preferred countries:</span> {studentProfile.preferences.preferredCountries.join(', ') || 'Not provided'}</p>
            </div>

            <div className="space-y-4 rounded-[1.75rem] border border-slate-200 p-6">
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <FileText className="h-5 w-5 text-amber-600" />
                <span>Supporting files</span>
              </h3>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Transcript semesters:</span> {studentProfile.transcript.semesters.length}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Documents:</span> {studentProfile.documents.length}</p>
              {studentProfile.transcript.fileUrl ? (
                <a
                  href={resolveUploadUrl(studentProfile.transcript.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-dark-blue transition hover:text-sky-700"
                >
                  <Eye className="h-4 w-4" />
                  <span>Open Transcript</span>
                </a>
              ) : (
                <p className="text-sm text-slate-500">No transcript file uploaded yet.</p>
              )}
              <div className="space-y-3">
                {studentProfile.documents.map((document) => (
                  <a
                    key={document._id}
                    href={resolveUploadUrl(document.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm transition hover:border-dark-blue hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-800">{document.type}</span>
                    <span className="text-slate-500">{document.status}</span>
                  </a>
                ))}
                {studentProfile.documents.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500">No supporting documents uploaded.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm font-medium text-slate-500">
            Select an assigned application to load the linked student profile.
          </div>
        )}
      </section>
    </div>
  );
}
