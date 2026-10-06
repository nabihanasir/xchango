import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, FileWarning, LoaderCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import CourseBrowser from '../../components/courses/CourseBrowser';
import CourseRequestsPanel from '../../components/courses/CourseRequestsPanel';
import { useAuth } from '../../context/AuthContext';
import { equivalencyApi } from '../../lib/api';
import { programOutlineApi } from '../../lib/programOutlineApi';
import { studentProfileApi } from '../../lib/studentProfileApi';
import type { CourseRequest } from '../../types/equivalency';
import { getCourseStepState } from '../../utils/courseStep';

export default function StudentCourses() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    if (!user?.token) {
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      setRequests(await equivalencyApi.getStudentRequests(user.token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your requests.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  // The advisor checks the request against the program outline and transcript, so tell the student if one is missing.
  const [missingDocuments, setMissingDocuments] = useState<string[]>([]);
  useEffect(() => {
    if (!user?._id) {
      return;
    }

    Promise.all([
      programOutlineApi.getMine().catch(() => undefined),
      studentProfileApi.getTranscript(user._id).catch(() => undefined),
    ]).then(([outline, transcript]) => {
      const missing: string[] = [];
      if (outline === null) missing.push('program outline');
      if (transcript && !transcript.semesters.length) missing.push('transcript');
      setMissingDocuments(missing);
    });
  }, [user?._id]);

  if (!user) {
    return (
      <div className="glass-card rounded-[2rem] p-8">
        <h2 className="text-2xl font-bold text-slate-800">Sign in to request course equivalency</h2>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card rounded-[2rem] p-8 text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const stepState = getCourseStepState(requests);

  return (
    <div className="space-y-8">
      {stepState === 'in_review' ? (
        <div className="flex items-start gap-4 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <Clock3 className="mt-0.5 h-6 w-6 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-bold">Your request is with your advisor</h2>
            <p className="mt-1 text-sm font-medium">
              You can't choose more courses until your advisor approves or rejects this request.
            </p>
          </div>
        </div>
      ) : null}

      {stepState === 'approved' ? (
        <div className="flex flex-col gap-4 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-800 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-bold">Course selection complete</h2>
              <p className="mt-1 text-sm font-medium">Your advisor approved your courses. Next, upload your documents.</p>
            </div>
          </div>
          <Link
            to="/dashboard/documents"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Continue to upload documents
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {stepState === 'rejected' ? (
        <div className="flex items-start gap-4 rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-800">
          <XCircle className="mt-0.5 h-6 w-6 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-bold">Your request was not approved</h2>
            <p className="mt-1 text-sm font-medium">
              Check your advisor's comments below, then choose your courses again and resubmit.
            </p>
          </div>
        </div>
      ) : null}

      {missingDocuments.length && (stepState === 'open' || stepState === 'rejected') ? (
        <div className="flex flex-col gap-4 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-800 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <FileWarning className="mt-0.5 h-6 w-6 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-bold">Upload your {missingDocuments.join(' and ')} first</h2>
              <p className="mt-1 text-sm font-medium">
                Your advisor checks your courses against your semester, credit limit and program plan. Without them the request
                can only be matched on course content.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/profile"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-800"
          >
            Go to profile
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {stepState === 'open' || stepState === 'rejected' ? (
        <CourseBrowser resubmitting={stepState === 'rejected'} onSubmitted={loadRequests} />
      ) : null}

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Your requests</h2>
        <CourseRequestsPanel
          requests={requests}
          isLoading={false}
          error={error}
          onRequestsChange={(update) => setRequests(update)}
        />
      </div>
    </div>
  );
}
