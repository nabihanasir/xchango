import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Eye, FileText, GraduationCap, UserRound, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { applicationApi } from '../../lib/applicationApi';
import { resolveUploadUrl, studentProfileApi } from '../../lib/studentProfileApi';
import {
  applicationStatusTone,
  getApplicationUserId,
  getApplicationUserSummary,
  type ApplicationStatus,
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
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [actionError, setActionError] = useState('');
  const [activeDecision, setActiveDecision] = useState<ApplicationStatus | null>(null);

  const stats = useMemo(() => {
    const pending = applications.filter((item) => item.status === 'PENDING_INTERVIEW').length;
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

        const profile = await studentProfileApi.getStudentProfile(studentId);
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSelectedApplication(application);
          setStudentProfile(profile);
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

  const handleDecision = async (
    status: Extract<ApplicationStatus, 'SHORTLISTED' | 'REJECTED'>,
    applicationId = selectedApplicationId
  ) => {
    const targetId = applicationId;
    if (!targetId) {
      return;
    }

    setActiveDecision(status);
    setActionError('');

    try {
      const updatedApplication = await applicationApi.updateStatus(targetId, status);
      syncApplication(updatedApplication);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update application status.');
    } finally {
      setActiveDecision(null);
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
              Review assigned applications and linked student profiles.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
              This workspace only loads applications assigned to you and the student profiles behind those applications.
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
            Advisors can review only applications assigned to their account.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
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
                  const canReview = application.status === 'PENDING_INTERVIEW';

                  return (
                    <tr key={application._id} className={application._id === selectedApplicationId ? 'bg-sky-50/60' : 'hover:bg-slate-50/70'}>
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
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${applicationStatusTone[application.status]}`}>
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
                          {canReview ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedApplicationId(application._id);
                                  void handleDecision('SHORTLISTED', application._id);
                                }}
                                disabled={activeDecision !== null}
                                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedApplicationId(application._id);
                                  void handleDecision('REJECTED', application._id);
                                }}
                                disabled={activeDecision !== null}
                                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : null}
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
        <h2 className="text-2xl font-black text-slate-900">Application Details</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Review the selected application before making a decision.
        </p>

        {detailsLoading ? (
          <div className="mt-6 h-48 rounded-2xl bg-slate-100 animate-pulse" />
        ) : selectedApplication ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-[1.75rem] border border-slate-200 p-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Application summary</p>
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
              <div className="inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white bg-dark-blue">
                {formatStatus(selectedApplication.status)}
              </div>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Student:</span> {selectedStudent?.name || 'Student record'}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Email:</span> {selectedStudent?.email || 'Email unavailable'}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Documents:</span> {selectedApplication.documents.length}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Selected courses:</span> {selectedApplication.selectedCourses.length}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Interview date:</span> {selectedApplication.interview ? new Date(selectedApplication.interview.date).toLocaleDateString() : 'Not scheduled'}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Interview location:</span> {selectedApplication.interview?.location || 'Not scheduled'}</p>
              {selectedApplication.status === 'PENDING_INTERVIEW' ? (
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleDecision('SHORTLISTED')}
                    disabled={activeDecision !== null}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" />
                    <span>{activeDecision === 'SHORTLISTED' ? 'Approving...' : 'Approve Application'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecision('REJECTED')}
                    disabled={activeDecision !== null}
                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    <span>{activeDecision === 'REJECTED' ? 'Rejecting...' : 'Reject Application'}</span>
                  </button>
                </div>
              ) : null}
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
          <div className="mt-6 h-48 rounded-2xl bg-slate-100 animate-pulse" />
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
