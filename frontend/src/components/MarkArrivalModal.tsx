import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Mail, PlaneLanding, X } from 'lucide-react';
import { adminApi } from '../lib/adminApi';
import { applicationApi } from '../lib/applicationApi';
import type { ApplicationCourseSummary, ArrivalResult, WorkflowApplication } from '../types/application';
import { AppApiError } from '../types/error';
import { getCourseDisplayTitle } from '../types/course';

interface MarkArrivalModalProps {
  application: WorkflowApplication;
  onClose: () => void;
  onRecorded?: (result: ArrivalResult) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function MarkArrivalModal({ application, onClose, onRecorded }: MarkArrivalModalProps) {
  const [arrivedAt, setArrivedAt] = useState(today);
  const [homeCourses, setHomeCourses] = useState<ApplicationCourseSummary[]>([]);
  const [onlineCourseIds, setOnlineCourseIds] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ArrivalResult | null>(null);

  const student = typeof application.studentId === 'object' ? application.studentId : null;

  useEffect(() => {
    adminApi
      .getCourses()
      .then(setHomeCourses)
      .catch(() => setHomeCourses([]))
      .finally(() => setLoadingCourses(false));
  }, []);

  const toggleCourse = (courseId: string) =>
    setOnlineCourseIds((current) =>
      current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId]
    );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await applicationApi.recordArrival(application._id, {
        arrivedAt,
        onlineHomeCourseIds: onlineCourseIds,
      });
      setResult(response);
      onRecorded?.(response);
    } catch (submitError) {
      if (submitError instanceof AppApiError) {
        setError(`${submitError.message} ${submitError.reason}`);
      } else {
        setError(submitError instanceof Error ? submitError.message : 'Unable to record arrival.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const sentCount = result?.notices.filter((notice) => notice.sent).length ?? 0;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-maroon/80 backdrop-blur-md" onClick={() => !submitting && onClose()} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-2xl animate-fade-in-up">
        <header className="flex items-center justify-between border-b border-light-color/60 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-maroon">
              <PlaneLanding className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-maroon">Mark student arrived</h2>
              <p className="text-sm font-medium text-body-text">
                {student?.name || 'Student'} · {application.university}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl p-2 text-maroon/40 transition-all hover:bg-slate-100 hover:text-maroon disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {result ? (
          <div className="space-y-4 overflow-y-auto p-6 sm:p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="text-sm font-medium">
                <p className="font-black">Arrival recorded.</p>
                <p className="mt-1">
                  {result.notices.length === 0
                    ? 'No instructors with an email address were found for this student’s courses.'
                    : `${sentCount} of ${result.notices.length} instructor email${result.notices.length === 1 ? '' : 's'} sent.`}
                </p>
              </div>
            </div>

            {!result.emailConfigured ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                Email is not set up on the server (SMTP_USER / SMTP_PASS), so no emails were sent.
              </p>
            ) : null}

            {result.notices.length ? (
              <ul className="space-y-2">
                {result.notices.map((notice) => (
                  <li key={notice.email} className="rounded-xl border border-light-color/60 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 font-bold text-maroon">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{notice.name || notice.email}</span>
                      </span>
                      <span className={`text-xs font-black ${notice.sent ? 'text-emerald-700' : 'text-red-600'}`}>
                        {notice.sent ? 'Sent' : 'Not sent'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-body-text">
                      {notice.side === 'host' ? 'Host university' : 'Home university (online)'} · {notice.courses.join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}

            {result.coursesWithoutInstructorEmail.length ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-body-text">
                <span className="font-bold text-maroon">No instructor email on file for:</span>{' '}
                {result.coursesWithoutInstructorEmail.join(', ')}. An admin can add it under Courses.
              </p>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-maroon-gradient px-6 py-2.5 font-bold text-white transition-all hover:brightness-110"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-6 sm:p-8">
            <p className="text-sm text-body-text">
              Instructors of the student&apos;s approved host-university courses will be emailed. Tick any home-university
              courses the student will keep taking online so those instructors are told as well.
            </p>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-maroon/60">Arrival date</label>
              <input
                type="date"
                value={arrivedAt}
                max={today()}
                onChange={(event) => setArrivedAt(event.target.value)}
                className="w-full rounded-xl border border-light-color bg-slate-50 px-4 py-3 font-medium text-maroon focus:outline-none focus:ring-2 focus:ring-accent-yellow/50"
                required
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-maroon/60">
                Home courses taken online (optional)
              </p>
              {loadingCourses ? (
                <div className="h-24 animate-pulse rounded-xl bg-slate-50" />
              ) : homeCourses.length === 0 ? (
                <p className="text-sm text-body-text">No home courses available.</p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-light-color/60 p-2">
                  {homeCourses.map((course) => (
                    <label
                      key={course._id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={onlineCourseIds.includes(course._id)}
                        onChange={() => toggleCourse(course._id)}
                        className="h-4 w-4 accent-maroon"
                      />
                      <span className="min-w-0 flex-1 font-semibold text-maroon">{getCourseDisplayTitle(course)}</span>
                      <span className="truncate text-xs text-body-text">
                        {course.instructorEmail ? course.instructorName || course.instructorEmail : 'No instructor email'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-100 px-6 py-2.5 font-bold text-body-text transition-all hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-accent-yellow px-6 py-2.5 font-bold text-maroon shadow-lg shadow-accent-yellow/20 transition-all hover:bg-yellow-default disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Mark arrived & notify'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.getElementById('modal-root') || document.body
  );
}
