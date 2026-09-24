import { startTransition, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, FileText, GraduationCap } from 'lucide-react';
import StudentProfileForm, { STUDENT_PROFILE_FORM_ID } from '../../components/student/StudentProfileForm';
import TranscriptUpload from '../../components/student/TranscriptUpload';
import TranscriptViewer from '../../components/student/TranscriptViewer';
import { useAuth } from '../../context/AuthContext';
import { studentProfileApi } from '../../lib/studentProfileApi';
import type {
  StudentProfile as StudentProfileType,
  StudentTranscript,
} from '../../types/studentProfile';

const summaryCardClassName = 'glass-card rounded-[2rem] p-6';

export default function StudentProfile() {
  const { user } = useAuth();
  const studentId = user?._id ?? '';

  const [profile, setProfile] = useState<StudentProfileType | null>(null);
  const [transcript, setTranscript] = useState<StudentTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [transcriptError, setTranscriptError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showSavedPopup, setShowSavedPopup] = useState(false);
  const [uploadingTranscript, setUploadingTranscript] = useState(false);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadStudentModule = async () => {
      setLoading(true);
      setPageError('');

      try {
        const [profileData, transcriptData] = await Promise.all([
          studentProfileApi.getStudentProfile(studentId),
          studentProfileApi.getTranscript(studentId),
        ]);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setProfile(profileData);
          setTranscript(transcriptData);
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPageError(error instanceof Error ? error.message : 'Unable to load student module.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadStudentModule();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const handleProfileSave = async (payload: {
    basicInfo: StudentProfileType['basicInfo'];
    preferences: StudentProfileType['preferences'];
  }) => {
    if (!studentId) {
      return;
    }

    setSavingProfile(true);
    setProfileError('');

    try {
      const updatedProfile = await studentProfileApi.updateStudentProfile(studentId, payload);
      setProfile(updatedProfile);
      setShowSavedPopup(true);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTranscriptUpload = async (file: File) => {
    if (!studentId) {
      return;
    }

    setUploadingTranscript(true);
    setTranscriptError('');

    try {
      const uploadedTranscript = await studentProfileApi.uploadTranscript(studentId, file);
      setTranscript(uploadedTranscript);
      setProfile((current) =>
        current
          ? {
              ...current,
              cgpa: uploadedTranscript.cgpa,
              transcript: uploadedTranscript,
            }
          : current
      );
    } catch (error) {
      setTranscriptError(error instanceof Error ? error.message : 'Unable to upload transcript.');
    } finally {
      setUploadingTranscript(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        Sign in as a student to access the student profile module.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass-card h-36 rounded-[2rem] animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="glass-card h-32 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile || pageError) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-sm font-medium text-red-700">
        {pageError || 'Student profile data could not be loaded.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#060424] via-[#0c174f] to-[#17387b] p-8 text-white shadow-2xl shadow-dark-blue/20 md:p-10">
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-accent-yellow/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-56 w-56 -translate-x-1/4 translate-y-1/4 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.35em] text-accent-yellow">
              Student Profile Hub
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              Student Profile Module
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
              Manage profile details, review transcripts, and track application progress in one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-300">Student</p>
              <p className="mt-2 text-xl font-black">{profile.basicInfo.fullName || user.name}</p>
              <p className="mt-1 text-sm text-slate-200">{profile.basicInfo.department || 'Department pending'}</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-300">Current Semester</p>
              <p className="mt-2 text-xl font-black">{profile.basicInfo.semester || 0}</p>
              <p className="mt-1 text-sm text-slate-200">CMS ID {profile.basicInfo.cmsId || 'Not added'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={summaryCardClassName}>
          <div
            className={`inline-flex rounded-2xl p-3 ${
              profile.isProfileComplete
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <FileText className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Profile Status
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {profile.isProfileComplete ? 'Complete' : 'Incomplete'}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {profile.isProfileComplete
              ? 'You can create an application.'
              : `Missing ${profile.profileCompletionIssues.join(', ') || 'required fields'}.`}
          </p>
        </div>

        <div className={summaryCardClassName}>
          <div className="inline-flex rounded-2xl bg-dark-blue p-3 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-slate-400">CGPA</p>
          <p className="mt-2 text-4xl font-black text-dark-blue">{(transcript?.cgpa ?? 0).toFixed(2)}</p>
        </div>

        <div className={summaryCardClassName}>
          <div className="inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <FileText className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Transcript Semesters</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{transcript?.semesters.length ?? 0}</p>
        </div>

      </div>

      <StudentProfileForm
        basicInfo={profile.basicInfo}
        preferences={profile.preferences}
        onSubmit={handleProfileSave}
      />

      <TranscriptUpload
        uploading={uploadingTranscript}
        currentFileUrl={transcript?.fileUrl}
        errorMessage={transcriptError}
        onUpload={handleTranscriptUpload}
      />

      <TranscriptViewer transcript={transcript} />

      <section className="glass-card rounded-[2rem] p-6 md:p-7">
        {profileError ? (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {profileError}
          </p>
        ) : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Saves your basic info and preferences. The transcript is stored as soon as you upload it.
          </p>
          <button
            type="submit"
            form={STUDENT_PROFILE_FORM_ID}
            disabled={savingProfile}
            className="rounded-2xl bg-dark-blue px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0e1550] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProfile ? 'Saving profile...' : 'Save profile'}
          </button>
        </div>
      </section>

      {showSavedPopup
        ? createPortal(
            <div className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-saved-title"
                className="w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-2xl shadow-slate-950/20"
              >
                <div className="mx-auto inline-flex rounded-full bg-emerald-100 p-3 text-emerald-700">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 id="profile-saved-title" className="mt-4 text-2xl font-black text-slate-900">
                  Profile saved
                </h3>
                <p className="mt-2 text-sm text-slate-500">Your profile has been saved successfully.</p>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setShowSavedPopup(false)}
                  className="mt-6 rounded-2xl bg-dark-blue px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0e1550]"
                >
                  OK
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
