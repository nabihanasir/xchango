import { useEffect, useState } from 'react';
import {
  getApplicationCourseId,
  getApplicationCourseLabel,
  type ApplicationCourseSummary,
  type WorkflowApplicationCourse,
} from '../types/application';

interface CourseSelectionProps {
  selectedCourses: WorkflowApplicationCourse[];
  availableCourses: ApplicationCourseSummary[];
  loadingCourses?: boolean;
  saving: boolean;
  errorMessage?: string;
  onSave: (courseIds: string[]) => Promise<void>;
}

export default function CourseSelection({
  selectedCourses,
  availableCourses,
  loadingCourses = false,
  saving,
  errorMessage,
  onSave,
}: CourseSelectionProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds(
      selectedCourses
        .map((course) => getApplicationCourseId(course.course))
        .filter(Boolean)
    );
  }, [selectedCourses]);

  const toggleCourse = (courseId: string) => {
    setSelectedIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId]
    );
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900">Course Selection</h3>
          <p className="mt-2 text-sm text-slate-500">
            Select from admin-managed course records for this application.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 px-4 py-3 text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Selected</p>
          <p className="mt-1 text-xl font-black text-slate-900">{selectedIds.length}</p>
        </div>
      </div>

      {loadingCourses ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : availableCourses.length ? (
        <div className="mt-5 space-y-3">
          {availableCourses.map((course) => {
            const isSelected = selectedIds.includes(course._id);
            return (
              <button
                key={course._id}
                type="button"
                onClick={() => toggleCourse(course._id)}
                className={`w-full rounded-[1.5rem] border px-5 py-4 text-left transition ${
                  isSelected
                    ? 'border-dark-blue bg-sky-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">{getApplicationCourseLabel(course)}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {typeof course.universityId === 'string' ? '' : course.universityId?.name || 'University not linked'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${
                      isSelected
                        ? 'bg-dark-blue text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Available'}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {course.description || 'No course description is available yet.'}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-8 text-sm font-medium text-slate-500">
          No managed courses are currently available for this application.
        </div>
      )}

      {errorMessage ? <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p> : null}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => void onSave(selectedIds)}
          disabled={saving || loadingCourses}
          className="rounded-2xl bg-dark-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Courses'}
        </button>
      </div>
    </section>
  );
}
