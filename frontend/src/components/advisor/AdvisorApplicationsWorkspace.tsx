import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import CountryHeroCarousel from '../CountryHeroCarousel';
import {
  Check,
  Eye,
  PlaneLanding,
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
import type { ProgramOutline } from '../../types/equivalency';
import type { JourneyInput } from '../../utils/studentJourney';
import { programOutlineApi } from '../../lib/programOutlineApi';
import ApplicationJourney from './ApplicationJourney';
import ProgramOutlinePanel from './ProgramOutlinePanel';
import Notice from '../Notice';

type Tab = 'overview' | 'interview' | 'transcript' | 'student' | 'documents';
type JourneyExtras = Pick<JourneyInput, 'requests' | 'visa' | 'results'>;

const SummaryCard = ({ title, value }: { title: string; value: string }) => (
  <div className="glass-card rounded-[2rem] p-6">
    <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-600">{title}</p>
    <p className="mt-3 text-4xl font-bold text-teal-700">{value}</p>
  </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
  </div>
);

export default function AdvisorApplicationsWorkspace({
  showHero = false,
}: {
  showHero?: boolean;
}) {
  const { user } = useAuth();
  const applicationRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [journeyExtras, setJourneyExtras] = useState<JourneyExtras>({ requests: [], visa: null, results: [] });
  const [programOutline, setProgramOutline] = useState<ProgramOutline | null>(null);

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

        // Optional sources: a failure only leaves those progress steps unfinished.
        const [extras, outline] = await Promise.all([
          applicationApi
            .getApplicationJourney(selectedApplicationId)
            .catch(() => ({ requests: [], visa: null, results: [] }) as JourneyExtras),
          programOutlineApi.getForStudent(studentId).catch(() => null),
        ]);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSelectedApplication(application);
          setStudentProfile(profile);
          setStudentDocuments(documents);
          setJourneyExtras(extras);
          setProgramOutline(outline);
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

  const handleOpen = (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    applicationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        <div className="border-b border-slate-200/80 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-900">Assigned Applications</h2>
          <p className="mt-1 text-sm text-slate-500">Select a row to review that student below.</p>
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
            <table className="min-w-full text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  {['Student', 'Destination', 'Status', ''].map((heading, index) => (
                    <th key={index} className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {applications.map((application) => {
                  const student = getApplicationUserSummary(application.studentId);
                  const isSelected = application._id === selectedApplicationId;

                  return (
                    <tr
                      key={application._id}
                      onClick={() => handleOpen(application._id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-emerald-50 shadow-[inset_4px_0_0_0_#0f766e]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{student?.name || 'Student record'}</p>
                        <p className="text-sm text-slate-500">{student?.email || 'Email unavailable'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{application.university}</p>
                        <p className="text-sm text-slate-500">
                          {application.program} · {application.country}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getApplicationStatusTone(application)}`}
                        >
                          {getApplicationStatusLabel(application)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-semibold ${isSelected ? 'text-teal-700' : 'text-slate-400'}`}>
                          {isSelected ? 'Reviewing' : 'Review'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailsError ? <Notice tone="error">{detailsError}</Notice> : null}
      {actionError ? <Notice tone="error">{actionError}</Notice> : null}

      <section ref={applicationRef} className="glass-card rounded-[2rem] p-6 lg:p-8">
        {detailsLoading ? (
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        ) : selectedApplication ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{selectedStudent?.name || 'Student record'}</p>
                <h2 className="text-2xl font-bold text-slate-900">{selectedApplication.university}</h2>
                <p className="text-sm text-slate-500">
                  {selectedApplication.program} · {selectedApplication.country}
                </p>
              </div>
              <span className="inline-flex rounded-full bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white">
                {getApplicationStatusLabel(selectedApplication)}
              </span>
            </div>

            <ApplicationJourney
              journey={{
                application: selectedApplication,
                requests: journeyExtras.requests,
                documents: studentDocuments,
                transcriptUploaded: Boolean(studentProfile?.transcript?.fileUrl),
                visa: journeyExtras.visa,
                results: journeyExtras.results,
              }}
            />

            <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
              {(
                [
                  ['overview', 'Overview'],
                  ['interview', 'Interview'],
                  ['transcript', 'Transcript & outline'],
                  ['student', 'Student profile'],
                  ['documents', `Documents (${studentDocuments.length})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                    activeTab === key
                      ? 'border-teal-700 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' ? (
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Registration number" value={selectedApplication.registrationNumber || 'Pending'} />
                <Field label="Passport valid" value={selectedApplication.passportValid ? 'Yes' : 'No'} />
                <Field label="Financially eligible" value={selectedApplication.financialEligible ? 'Yes' : 'Flagged for review'} />
                <Field
                  label="Travel history"
                  value={selectedApplication.travelHistory.hasTravelHistory ? selectedApplication.travelHistory.details || 'Declared' : 'None'}
                />
                <Field
                  label="Medical condition"
                  value={selectedApplication.medicalCondition.hasCondition ? selectedApplication.medicalCondition.details || 'Declared' : 'None'}
                />
                <Field label="Documents attached" value={String(selectedApplication.documents.length)} />
              </dl>
            ) : null}

            {activeTab === 'interview' ? (
              <div className="space-y-5">
                <dl className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Interview date"
                    value={
                      selectedApplication.interviewDate
                        ? new Date(selectedApplication.interviewDate).toLocaleDateString()
                        : selectedApplication.interview
                          ? new Date(selectedApplication.interview.date).toLocaleDateString()
                          : 'Not scheduled'
                    }
                  />
                  <Field label="Location" value={selectedApplication.interview?.location || 'Not scheduled'} />
                </dl>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <p className="text-sm font-bold text-slate-900">Schedule interview</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-sm font-semibold text-slate-700">
                      <span>Date</span>
                      <input
                        type="date"
                        value={interviewForm.date}
                        onChange={(event) => setInterviewForm((current) => ({ ...current, date: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
                      />
                    </label>
                    <label className="space-y-1 text-sm font-semibold text-slate-700">
                      <span>Location</span>
                      <input
                        type="text"
                        value={interviewForm.location}
                        onChange={(event) => setInterviewForm((current) => ({ ...current, location: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
                        placeholder="Advisor office or meeting link"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleScheduleInterview()}
                      disabled={schedulingInterview || !['ASSIGNED', 'INTERVIEW_SCHEDULED'].includes(selectedApplication.status)}
                      className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {schedulingInterview ? 'Saving...' : 'Schedule interview'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCompleteInterview()}
                      disabled={completingInterview || selectedApplication.status !== 'INTERVIEW_SCHEDULED'}
                      className="inline-flex items-center gap-2 rounded-full border border-teal-700 px-5 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      {completingInterview ? 'Completing...' : 'Mark interview completed'}
                    </button>
                  </div>
                </div>

                {isAwaitingAdvisorDecision(selectedApplication) ? (
                  <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
                    <p className="text-sm font-bold text-amber-800">Interview decision</p>
                    <p className="text-sm text-slate-600">
                      Recommend the student to let them continue, or decline to stop the application. The student is
                      told the outcome, and it cannot be changed afterwards.
                    </p>
                    <label className="block space-y-1 text-sm font-semibold text-slate-700">
                      <span>Note to student (required if not recommending)</span>
                      <textarea
                        value={decisionNotes}
                        onChange={(event) => setDecisionNotes(event.target.value)}
                        maxLength={1000}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
                        placeholder="Add feedback from the interview"
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleInterviewDecision(true)}
                        disabled={Boolean(submittingDecision)}
                        className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Check className="h-4 w-4" />
                        {submittingDecision === 'recommend' ? 'Saving...' : 'Recommend'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleInterviewDecision(false)}
                        disabled={Boolean(submittingDecision)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <X className="h-4 w-4" />
                        {submittingDecision === 'not-recommend' ? 'Saving...' : 'Not recommend'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {selectedApplication.interviewDecision ? (
                  <div
                    className={`rounded-2xl border p-5 ${
                      selectedApplication.interviewDecision.recommended
                        ? 'border-emerald-200 bg-emerald-50/70'
                        : 'border-rose-200 bg-rose-50/70'
                    }`}
                  >
                    <p
                      className={`text-sm font-bold ${
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
                    <p className="mt-2 text-xs text-slate-500">
                      Recorded {new Date(selectedApplication.interviewDecision.decidedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : null}

                {selectedApplication.arrival?.arrivedAt ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                    <p className="text-sm font-bold text-teal-700">Arrived at host university</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {new Date(selectedApplication.arrival.arrivedAt).toLocaleDateString()} ·{' '}
                      {selectedApplication.arrival.notices.filter((notice) => notice.sent).length} instructor email(s) sent
                    </p>
                  </div>
                ) : canMarkArrival(selectedApplication) ? (
                  <div className="space-y-3">
                    {selectedApplication.arrivalReport?.reportedAt ? (
                      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                        The student reported arriving on {new Date(selectedApplication.arrivalReport.reportedAt).toLocaleDateString()}. Confirm it below.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setArrivalModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      <PlaneLanding className="h-4 w-4" />
                      Mark student arrived
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'student' ? (
              studentProfile ? (
                <div className="space-y-5">
                  <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Full name" value={studentProfile.basicInfo.fullName || selectedStudent?.name || 'N/A'} />
                    <Field label="Email" value={studentProfile.basicInfo.email || selectedStudent?.email || 'N/A'} />
                    <Field label="Phone" value={studentProfile.basicInfo.phone || selectedStudent?.phone || 'N/A'} />
                    <Field label="Department" value={studentProfile.basicInfo.department || 'N/A'} />
                    <Field label="Semester" value={String(studentProfile.basicInfo.semester || 'N/A')} />
                    <Field label="CGPA" value={studentProfile.transcript.cgpa.toFixed(2)} />
                    <Field label="Field of interest" value={studentProfile.preferences.fieldOfInterest || 'Not provided'} />
                    <Field label="Preferred countries" value={studentProfile.preferences.preferredCountries.join(', ') || 'Not provided'} />
                    <Field label="Transcript semesters" value={String(studentProfile.transcript.semesters.length)} />
                  </dl>
                  {studentProfile.transcript.fileUrl ? (
                    <a
                      href={resolveUploadUrl(studentProfile.transcript.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 transition hover:text-teal-900"
                    >
                      <Eye className="h-4 w-4" />
                      Open transcript
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500">No transcript file uploaded yet.</p>
                  )}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">Student profile unavailable.</p>
              )
            ) : null}

            {activeTab === 'transcript' ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900">Parsed transcript</h3>
                    {studentProfile?.transcript.fileUrl ? (
                      <a
                        href={resolveUploadUrl(studentProfile.transcript.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 transition hover:text-teal-900"
                      >
                        <Eye className="h-4 w-4" />
                        Open original file
                      </a>
                    ) : null}
                  </div>
                  {studentProfile && studentProfile.transcript.semesters.length > 0 ? (
                    <>
                      <dl className="grid gap-5 sm:grid-cols-3">
                        <Field label="CGPA" value={studentProfile.transcript.cgpa.toFixed(2)} />
                        <Field label="Total credits" value={String(studentProfile.transcript.totalCredits)} />
                        <Field label="Semesters" value={String(studentProfile.transcript.semesters.length)} />
                      </dl>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {studentProfile.transcript.semesters.map((semester) => (
                          <div key={semester.semester} className="overflow-hidden rounded-2xl border border-slate-200">
                            <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                              <p className="text-sm font-bold text-slate-900">Semester {semester.semester}</p>
                              <p className="text-xs font-semibold text-slate-500">SGPA {semester.sgpa.toFixed(2)}</p>
                            </div>
                            <table className="min-w-full text-sm">
                              <tbody className="divide-y divide-slate-100">
                                {semester.courses.map((course, index) => (
                                  <tr key={`${course.courseName}-${index}`}>
                                    <td className="px-4 py-2 text-slate-800">{course.courseName}</td>
                                    <td className="px-2 py-2 text-right text-slate-500">{course.creditHours} cr</td>
                                    <td className="px-4 py-2 text-right font-semibold text-slate-900">{course.grade}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-8 text-center text-sm text-slate-500">
                      No parsed transcript yet. The student has not uploaded one, or it could not be read.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900">Program outline</h3>
                  {programOutline ? (
                    <ProgramOutlinePanel
                      studentId={getApplicationUserId(selectedApplication.studentId)}
                      outline={programOutline}
                      onSaved={async () => {
                        const refreshed = await programOutlineApi
                          .getForStudent(getApplicationUserId(selectedApplication.studentId))
                          .catch(() => null);
                        setProgramOutline(refreshed);
                      }}
                    />
                  ) : (
                    <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-8 text-center text-sm text-slate-500">
                      The student has not uploaded a program outline.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === 'documents' ? (
              <div className="space-y-3">
                {documentsError ? <Notice tone="error">{documentsError}</Notice> : null}
                <DocumentList
                  documents={studentDocuments}
                  updatingId={updatingDocumentId}
                  emptyMessage="No supporting documents uploaded."
                  onUpdateStatus={handleDocumentStatusUpdate}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm font-medium text-slate-500">
            Select an application above to review it.
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
