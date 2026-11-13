import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import CountryHeroCarousel from '../CountryHeroCarousel';
import {
  Check,
  Eye,
  FileText,
  GraduationCap,
  PlaneLanding,
  UserRound,
  X,
} from 'lucide-react';
import DocumentList from '../../components/DocumentList';
import MarkArrivalModal from '../../components/MarkArrivalModal';
import { canMarkArrival } from '../../utils/arrival';
import { useAuth } from '../../context/AuthContext';
import { applicationApi } from '../../lib/applicationApi';
import { resolveUploadUrl, studentProfileApi } from '../../lib/studentProfileApi';
import { documentApi } from '../../lib/documentApi';
import {
  getApplicationStatusLabel,
  getApplicationStatusTone,
  getApplicationUserId,
  getApplicationUserSummary,
  isAwaitingAdvisorDecision,
  type WorkflowApplication,
} from '../../types/application';
import type { StudentProfile } from '../../types/studentProfile';
import type { StudentDocument } from '../../types/document';
import Notice from '../Notice';

const SummaryCard = ({ title, value }: { title: string; value: string }) => (
  <div className="glass-card rounded-[2rem] p-6">
    <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-600">{title}</p>
    <p className="mt-3 text-4xl font-bold text-teal-700">{value}</p>
  </div>
);


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
  const [studentDocuments, setStudentDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [documentsError, setDocumentsError] = useState('');
  const [actionError, setActionError] = useState('');
  const [updatingDocumentId, setUpdatingDocumentId] = useState('');
  const [interviewForm, setInterviewForm] = useState({ date: '', location: 'Advisor Office' });
  const [schedulingInterview, setSchedulingInterview] = useState(false);
  const [completingInterview, setCompletingInterview] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState<'recommend' | 'not-recommend' | ''>('');
  const [arrivalModalOpen, setArrivalModalOpen] = useState(false);

  const stats = useMemo(() => {
    const pending = applications.filter((item) =>
      ['ASSIGNED', 'INTERVIEW_SCHEDULED'].includes(item.status)
    ).length;
    const shortlisted = applications.filter((item) => item.status === 'SHORTLISTED').length;
    const rejected = applications.filter((item) => item.status === 'REJECTED').length;

    return { pending, shortlisted, rejected };
  }, [applications]);

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
      setStudentDocuments([]);
      setDetailsError('');
      setDocumentsError('');
      return;
    }

    let cancelled = false;

    const loadDetails = async () => {
      setDetailsLoading(true);
      setDetailsError('');
      setDocumentsError('');

      try {
        const application = await applicationApi.getApplication(selectedApplicationId);
        const studentId = getApplicationUserId(application.studentId);

        if (!studentId) {
          throw new Error('Student record could not be resolved for this application.');
        }

        const profile = await studentProfileApi.getStudentProfile(studentId);
        const documents = await documentApi
          .getStudentDocuments(studentId)
          .catch((documentError) => {
            if (!cancelled) {
              setDocumentsError(
                documentError instanceof Error
                  ? documentError.message
                  : 'Unable to load supporting documents.'
              );
            }
            return [] as StudentDocument[];
          });

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSelectedApplication(application);
          setStudentProfile(profile);
          setStudentDocuments(documents);
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

  useEffect(() => {
    setDecisionNotes('');
  }, [selectedApplicationId]);

  const syncApplication = (updatedApplication: WorkflowApplication) => {
    setApplications((current) =>
      current.map((application) =>
        application._id === updatedApplication._id ? updatedApplication : application
      )
    );
    setSelectedApplication(updatedApplication);
  };

  const handleOpen = (applicationId: string, target: 'application' | 'student') => {
    setSelectedApplicationId(applicationId);
    (target === 'student' ? studentRef.current : applicationRef.current)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleDocumentStatusUpdate = async (documentId: string, status: 'approved' | 'rejected') => {
    setUpdatingDocumentId(documentId);
    setDocumentsError('');

    try {
      const updatedDocument = await documentApi.updateDocumentStatus(documentId, status);
      setStudentDocuments((current) =>
        current.map((document) => (document._id === updatedDocument._id ? updatedDocument : document))
      );
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Unable to update document status.');
    } finally {
      setUpdatingDocumentId('');
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

  const handleInterviewDecision = async (recommended: boolean) => {
    if (!selectedApplicationId) {
      return;
    }

    const notes = decisionNotes.trim();

    if (!recommended) {
      if (!notes) {
        setActionError('Add a short reason so the student knows why they are not recommended.');
        return;
      }

      if (!window.confirm('Not recommending this student stops their application and cannot be undone. Continue?')) {
        return;
      }
    }

    setSubmittingDecision(recommended ? 'recommend' : 'not-recommend');
    setActionError('');

    try {
      const updatedApplication = await applicationApi.recordInterviewDecision(selectedApplicationId, {
        recommended,
        notes,
      });
      syncApplication(updatedApplication);
      setDecisionNotes('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to record the interview decision.');
    } finally {
      setSubmittingDecision('');
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
        <CountryHeroCarousel
          title="Review assigned applications"
          description="AI suggests course matches and reasons, but the final approval or rejection remains with the advisor."
          scrimClass="bg-advisor-side/60"
          minHeightClass="min-h-[200px]"
          showTicker={false}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Assigned Applications" value={String(applications.length)} />
        <SummaryCard title="Pending Interview" value={String(stats.pending)} />
        <SummaryCard title="Shortlisted / Rejected" value={`${stats.shortlisted} / ${stats.rejected}`} />
      </div>

      {pageError ? (
        <Notice tone="error">{pageError}</Notice>
      ) : null}

      <section className="glass-card overflow-hidden rounded-[2rem]">
        <div className="border-b border-slate-200/80 px-6 py-6">
          <h2 className="text-2xl font-bold text-slate-900">Assigned Applications</h2>
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
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Student</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Country</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">University</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Actions</th>
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
                          ? 'bg-emerald-50/60'
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
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${getApplicationStatusTone(application)}`}
                        >
                          {getApplicationStatusLabel(application)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpen(application._id, 'application')}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-700 transition hover:border-teal-700 hover:text-teal-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Application</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpen(application._id, 'student')}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-700 transition hover:border-teal-700 hover:text-teal-700"
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
        <Notice tone="error">{detailsError}</Notice>
      ) : null}

      {actionError ? (
        <Notice tone="error">{actionError}</Notice>
      ) : null}

      <section ref={applicationRef} className="glass-card rounded-[2rem] p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Application Details</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Review assigned students, schedule interviews, and record a recommendation after each interview.
            </p>
          </div>
        </div>
        {detailsLoading ? (
          <div className="mt-6 h-48 animate-pulse rounded-2xl bg-slate-100" />
        ) : selectedApplication ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded-[1.75rem] border border-slate-200 p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-600">
                    Application summary
                  </p>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900">{selectedApplication.university}</h3>
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
                <div className="inline-flex rounded-full bg-teal-700 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                  {getApplicationStatusLabel(selectedApplication)}
                </div>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Student:</span> {selectedStudent?.name || 'Student record'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Email:</span> {selectedStudent?.email || 'Email unavailable'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Documents:</span> {selectedApplication.documents.length}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Interview date:</span> {selectedApplication.interviewDate ? new Date(selectedApplication.interviewDate).toLocaleDateString() : selectedApplication.interview ? new Date(selectedApplication.interview.date).toLocaleDateString() : 'Not scheduled'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Interview location:</span> {selectedApplication.interview?.location || 'Not scheduled'}</p>
                <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
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
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
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
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
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
                      className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>{schedulingInterview ? 'Saving...' : 'Schedule Interview'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCompleteInterview()}
                      disabled={
                        completingInterview || selectedApplication.status !== 'INTERVIEW_SCHEDULED'
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      <span>
                        {completingInterview ? 'Completing...' : 'Mark Interview Completed'}
                      </span>
                    </button>
                  </div>
                </div>

                {isAwaitingAdvisorDecision(selectedApplication) ? (
                  <div className="space-y-3 rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                      Interview Decision
                    </p>
                    <p className="text-sm text-slate-600">
                      Recommend the student to let them continue the application, or decline to stop it. The
                      student is told the outcome, and the decision cannot be changed afterwards.
                    </p>
                    <label className="block space-y-2 text-sm font-semibold text-slate-700">
                      <span>Note to student (required if not recommending)</span>
                      <textarea
                        value={decisionNotes}
                        onChange={(event) => setDecisionNotes(event.target.value)}
                        maxLength={1000}
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
                        placeholder="Add feedback from the interview"
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleInterviewDecision(true)}
                        disabled={Boolean(submittingDecision)}
                        className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Check className="h-4 w-4" />
                        <span>{submittingDecision === 'recommend' ? 'Saving...' : 'Recommend'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleInterviewDecision(false)}
                        disabled={Boolean(submittingDecision)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <X className="h-4 w-4" />
                        <span>{submittingDecision === 'not-recommend' ? 'Saving...' : 'Not Recommend'}</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {selectedApplication.interviewDecision ? (
                  <div
                    className={`rounded-[1.5rem] border p-4 ${
                      selectedApplication.interviewDecision.recommended
                        ? 'border-emerald-200 bg-emerald-50/70'
                        : 'border-rose-200 bg-rose-50/70'
                    }`}
                  >
                    <p
                      className={`text-xs font-bold uppercase tracking-[0.2em] ${
                        selectedApplication.interviewDecision.recommended ? 'text-teal-700' : 'text-rose-700'
                      }`}
                    >
                      {selectedApplication.interviewDecision.recommended
                        ? 'Recommended - student can proceed'
                        : 'Not recommended - application stopped'}
                    </p>
                    {selectedApplication.interviewDecision.notes ? (
                      <p className="mt-2 text-sm text-slate-700">{selectedApplication.interviewDecision.notes}</p>
                    ) : null}
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Recorded {new Date(selectedApplication.interviewDecision.decidedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : null}

                {selectedApplication.arrival?.arrivedAt ? (
                  <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Arrived at host university</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {new Date(selectedApplication.arrival.arrivedAt).toLocaleDateString()} ·{' '}
                      {selectedApplication.arrival.notices.filter((notice) => notice.sent).length} instructor email(s) sent
                    </p>
                  </div>
                ) : canMarkArrival(selectedApplication) ? (
                  <>
                  {selectedApplication.arrivalReport?.reportedAt ? (
                    <p className="mb-3 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                      The student reported arriving on {new Date(selectedApplication.arrivalReport.reportedAt).toLocaleDateString()}. Confirm it below.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setArrivalModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                  >
                    <PlaneLanding className="h-4 w-4" />
                    Mark student arrived
                  </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm font-medium text-slate-500">
            Select an assigned application to inspect its details.
          </div>
        )}
      </section>

      <section ref={studentRef} className="glass-card rounded-[2rem] p-6 lg:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Student Profile View</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Loaded only for the student linked to the selected assigned application.
        </p>

        {detailsLoading ? (
          <div className="mt-6 h-48 animate-pulse rounded-2xl bg-slate-100" />
        ) : studentProfile ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="space-y-4 rounded-[1.75rem] border border-slate-200 p-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <GraduationCap className="h-5 w-5 text-emerald-600" />
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
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <FileText className="h-5 w-5 text-amber-600" />
                <span>Supporting files</span>
              </h3>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Transcript semesters:</span> {studentProfile.transcript.semesters.length}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Documents:</span> {studentDocuments.length}</p>
              {studentProfile.transcript.fileUrl ? (
                <a
                  href={resolveUploadUrl(studentProfile.transcript.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 transition hover:text-teal-900"
                >
                  <Eye className="h-4 w-4" />
                  <span>Open Transcript</span>
                </a>
                ) : (
                  <p className="text-sm text-slate-500">No transcript file uploaded yet.</p>
                )}
              {documentsError ? (
                <Notice tone="error">{documentsError}</Notice>
              ) : null}
              <DocumentList
                documents={studentDocuments}
                updatingId={updatingDocumentId}
                emptyMessage="No supporting documents uploaded."
                onUpdateStatus={handleDocumentStatusUpdate}
              />
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 px-6 py-10 text-center text-sm font-medium text-slate-500">
            Select an assigned application to load the linked student profile.
          </div>
        )}
      </section>
      {arrivalModalOpen && selectedApplication ? (
        <MarkArrivalModal
          role="advisor"
          application={selectedApplication}
          onClose={() => setArrivalModalOpen(false)}
          onRecorded={(result) => syncApplication(result.application)}
        />
      ) : null}
    </div>
  );
}
