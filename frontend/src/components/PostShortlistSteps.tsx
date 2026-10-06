import { useEffect, useState } from 'react';
import { ArrowRight, Check, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentApi } from '../lib/documentApi';
import { equivalencyApi } from '../lib/api';
import type { StudentDocument } from '../types/document';
import type { CourseRequest } from '../types/equivalency';
import { getCourseStepState } from '../utils/courseStep';

const requiredDocumentTypes = ['transcript', 'cv', 'passport'];

type StepState = 'done' | 'current' | 'locked';

interface Step {
  title: string;
  description: string;
  state: StepState;
  action?: { label: string; to: string };
}

const circleClasses: Record<StepState, string> = {
  done: 'border-slate-300 bg-slate-300 text-white',
  current: 'border-dark-blue bg-white text-dark-blue',
  locked: 'border-slate-200 bg-white text-slate-400',
};

export default function PostShortlistSteps() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id || !user.token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    Promise.all([
      equivalencyApi.getStudentRequests(user.token).catch(() => [] as CourseRequest[]),
      documentApi.getStudentDocuments(user._id).catch(() => [] as StudentDocument[]),
    ])
      .then(([loadedRequests, loadedDocuments]) => {
        if (!cancelled) {
          setRequests(loadedRequests);
          setDocuments(loadedDocuments);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?._id, user?.token]);

  if (loading) {
    return <div className="glass-card h-40 animate-pulse rounded-[2rem]" />;
  }

  const courseState = getCourseStepState(requests);
  const coursesDone = courseState === 'approved';
  const uploadedTypes = new Set(documents.map((document) => document.type));
  const documentsDone = requiredDocumentTypes.every((type) => uploadedTypes.has(type));

  const courseStep: Step = {
    title: 'Course selection',
    state: coursesDone ? 'done' : 'current',
    ...(courseState === 'approved'
      ? { description: 'Your advisor approved your courses.' }
      : courseState === 'in_review'
        ? {
            description: 'Your request is with your advisor. You can choose more courses once it has been reviewed.',
            action: { label: 'View request', to: '/dashboard/courses' },
          }
        : courseState === 'rejected'
          ? {
              description: 'Your request was not approved. Review the advisor comments and resubmit.',
              action: { label: 'Resubmit request', to: '/dashboard/courses' },
            }
          : {
              description: 'Choose the host courses you want approved and send them to your advisor.',
              action: { label: 'Choose courses', to: '/dashboard/courses' },
            }),
  };

  const documentStep: Step = {
    title: 'Upload documents',
    state: documentsDone ? 'done' : coursesDone ? 'current' : 'locked',
    description: documentsDone
      ? 'All required documents are uploaded.'
      : coursesDone
        ? 'Your courses are approved. Upload your transcript, CV and passport.'
        : 'Available once your courses are approved.',
    action: coursesDone && !documentsDone ? { label: 'Continue to upload documents', to: '/dashboard/documents' } : undefined,
  };

  const steps: Step[] = [
    {
      title: 'Shortlisted',
      state: 'done',
      description: 'Your application has been shortlisted.',
    },
    courseStep,
    documentStep,
  ];

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900">Next steps</h3>
      <ol className="mt-5">
        {steps.map((step, index) => (
          <li key={step.title} className="relative pb-6 last:pb-0">
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 bg-slate-200" />
            ) : null}
            <div className="flex gap-4">
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${circleClasses[step.state]}`}
              >
                {step.state === 'done' ? (
                  <Check className="h-4 w-4" />
                ) : step.state === 'locked' ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${step.state === 'done' ? 'text-slate-400' : 'text-slate-900'}`}>
                  {step.title}
                  {step.state === 'done' ? <span className="ml-2 text-xs font-medium">Complete</span> : null}
                </p>
                <p className={`mt-1 text-sm ${step.state === 'locked' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {step.description}
                </p>
                {step.action ? (
                  <Link
                    to={step.action.to}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-dark-blue px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0e1550]"
                  >
                    {step.action.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
