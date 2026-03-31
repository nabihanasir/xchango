import { useState } from 'react';
import type { WorkflowApplicationCourse } from '../types/application';

interface CourseSelectionProps {
  selectedCourses: WorkflowApplicationCourse[];
  saving: boolean;
  errorMessage?: string;
  onSave: (courseNames: string[]) => Promise<void>;
}

export default function CourseSelection({
  selectedCourses,
  saving,
  errorMessage,
  onSave,
}: CourseSelectionProps) {
  const [value, setValue] = useState(selectedCourses.map((course) => course.courseName).join(', '));

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black text-slate-900">Course Selection</h3>
      <p className="mt-2 text-sm text-slate-500">Enter selected courses separated by commas.</p>
      <textarea
        className="mt-5 min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Data Structures, Database Systems, Operating Systems"
      />
      {errorMessage ? <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p> : null}
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() =>
            void onSave(
              value
                .split(',')
                .map((course) => course.trim())
                .filter(Boolean)
            )
          }
          disabled={saving}
          className="rounded-2xl bg-dark-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Courses'}
        </button>
      </div>
    </section>
  );
}
