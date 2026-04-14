import { startTransition, useEffect, useState } from 'react';
import { FileText, Globe2, GraduationCap, NotebookPen } from 'lucide-react';
import StudentProfileForm from '../../components/student/StudentProfileForm';
import TranscriptUpload from '../../components/student/TranscriptUpload';
import TranscriptViewer from '../../components/student/TranscriptViewer';
import Documents from '../../components/student/Documents';
import { useAuth } from '../../context/AuthContext';
import { studentProfileApi } from '../../lib/studentProfileApi';
import type {
  StudentDocument,
  StudentProfile as StudentProfileType,
  StudentTranscript,
} from '../../types/studentProfile';

const summaryCardClassName = 'glass-card rounded-[2rem] p-6';

export default function StudentProfile() {
  const { user } = useAuth();
  const studentId = user?._id ?? '';

  const [profile, setProfile] = useState<StudentProfileType | null>(null);
  const [transcript, setTranscript] = useState<StudentTranscript | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [transcriptError, setTranscriptError] = useState('');
  const [documentsError, setDocumentsError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingTranscript, setUploadingTranscript] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

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
        const [profileData, transcriptData, documentsData] = await Promise.all([
          studentProfileApi.getStudentProfile(studentId),
          studentProfileApi.getTranscript(studentId),
          studentProfileApi.getDocuments(studentId),
        ]);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setProfile(profileData);
          setTranscript(transcriptData);
          setDocuments(documentsData);
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

  const handleDocumentUpload = async (type: string, file: File) => {
    if (!studentId) {
      return;
    }

    setUploadingDocument(true);
    setDocumentsError('');

    try {
      const updatedDocuments = await studentProfileApi.uploadDocument(studentId, type, file);
      setDocuments(updatedDocuments);
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Unable to upload document.');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    setDeletingDocumentId(documentId);
    setDocumentsError('');

    try {
      const updatedDocuments = await studentProfileApi.deleteDocument(documentId);
      setDocuments(updatedDocuments);
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : 'Unable to delete document.');
    } finally {
      setDeletingDocumentId(null);
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              Riphah Outbound Mobility
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              Student Profile Module
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
              Manage profile details, parse transcripts, organize required documents, and track application progress in one place.
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
          <div className="inline-flex rounded-2xl bg-accent-yellow/20 p-3 text-dark-blue">
            <NotebookPen className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Documents</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{documents.length}</p>
        </div>

        <div className={summaryCardClassName}>
          <div className="inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <FileText className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Transcript Semesters</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{transcript?.semesters.length ?? 0}</p>
        </div>

        <div className={summaryCardClassName}>
          <div className="inline-flex rounded-2xl bg-sky-100 p-3 text-sky-700">
            <Globe2 className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Preferred Countries</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{profile.preferences.preferredCountries.length}</p>
        </div>
      </div>

      <StudentProfileForm
        basicInfo={profile.basicInfo}
        preferences={profile.preferences}
        saving={savingProfile}
        errorMessage={profileError}
        onSubmit={handleProfileSave}
      />

      <TranscriptUpload
        uploading={uploadingTranscript}
        currentFileUrl={transcript?.fileUrl}
        errorMessage={transcriptError}
        onUpload={handleTranscriptUpload}
      />

      <TranscriptViewer transcript={transcript} />

      <Documents
        documents={documents}
        uploading={uploadingDocument}
        deletingId={deletingDocumentId}
        errorMessage={documentsError}
        onUpload={handleDocumentUpload}
        onDelete={handleDocumentDelete}
      />
    </div>
  );
}
