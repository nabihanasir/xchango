import { useEffect, useState } from 'react';
import { AlertTriangle, FileText, ListChecks, LoaderCircle, Save } from 'lucide-react';
import Collapsible from './Collapsible';
import { programOutlineApi } from '../../lib/programOutlineApi';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type { OutlineCategory, OutlineSemester, PlanSummary, ProgramOutline } from '../../types/equivalency';

export const CATEGORY_OPTIONS: Array<{ value: OutlineCategory; label: string }> = [
  { value: 'computing_core', label: 'Computing core' },
  { value: 'mathematics_supporting', label: 'Mathematics & supporting' },
  { value: 'general_education', label: 'General education' },
  { value: 'domain_core', label: 'Domain core' },
  { value: 'domain_elective', label: 'Domain elective' },
  { value: 'elective_supporting', label: 'Elective supporting' },
  { value: 'unknown', label: 'Uncategorised' },
];

interface ProgramOutlinePanelProps {
  studentId: string;
  summary?: PlanSummary;
  outline?: ProgramOutline | null;
  /** Called after the advisor saves, so the request can be reloaded with the new checks. */
  onSaved: () => Promise<void> | void;
}

const cloneSemesters = (semesters: OutlineSemester[]): OutlineSemester[] =>
  semesters.map((semester) => ({ ...semester, courses: semester.courses.map((course) => ({ ...course })) }));

const Chip = ({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'red' | 'amber' | 'blue' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-sky-100 text-sky-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
};

/**
 * What the advisor needs to judge a request against the student's program: current semester, the credit
 * limit, and the semester-wise plan the student uploaded. Course types are set per student here, because
 * the plan only marks them by colour. It stays closed, with the things that need attention in its header.
 */
export default function ProgramOutlinePanel({ studentId, summary, outline, onSaved }: ProgramOutlinePanelProps) {
  const [semesters, setSemesters] = useState<OutlineSemester[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setSemesters(outline ? cloneSemesters(outline.semesters) : []);
    setIsDirty(false);
  }, [outline]);

  const setCategory = (semesterNumber: number, courseIndex: number, category: OutlineCategory) => {
    setSemesters((current) =>
      current.map((semester) =>
        semester.semester === semesterNumber
          ? {
              ...semester,
              courses: semester.courses.map((course, index) => (index === courseIndex ? { ...course, category } : course)),
            }
          : semester
      )
    );
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      await programOutlineApi.update(studentId, semesters);
      await onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the program outline.');
    } finally {
      setIsSaving(false);
    }
  };

  const overCap = summary?.withinCap === false;
  const missingOutline = !summary?.outlineAvailable;
  const missingTranscript = !summary?.transcriptAvailable;

  const title = (
    <span className="flex flex-wrap items-center gap-2">
      <ListChecks className="h-4 w-4 text-slate-500" />
      <span>Program plan</span>
      {summary?.currentSemester != null ? <Chip tone="blue">Semester {summary.currentSemester}</Chip> : null}
      {summary?.allowedCredits != null ? (
        <Chip tone={overCap ? 'red' : 'slate'}>
          {summary.requestedCredits}/{summary.allowedCredits} credit hours
        </Chip>
      ) : null}
      {missingOutline ? <Chip tone="amber">No outline</Chip> : null}
      {missingTranscript ? <Chip tone="amber">No transcript</Chip> : null}
      {outline && !outline.categoriesReviewed ? <Chip tone="amber">Course types need review</Chip> : null}
    </span>
  );

  return (
    <Collapsible variant="card" title={title}>
      <div className="space-y-4 pt-2">
        {missingOutline || missingTranscript ? (
          <div className="flex items-start gap-3 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {missingOutline && missingTranscript
                ? 'No program outline or transcript is uploaded, so eligibility could not be checked.'
                : missingOutline
                  ? 'No program outline is uploaded, so plan, course type and credit limit could not be checked.'
                  : 'No transcript is uploaded, so the semester and passed courses are unknown.'}{' '}
              Matches are based on course content only.
            </p>
          </div>
        ) : null}

        {overCap && summary ? (
          <p className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {summary.requestedCredits - (summary.allowedCredits ?? 0)} credit hours over the limit for semester{' '}
            {summary.currentSemester}. The courses that push it over are flagged.
          </p>
        ) : null}

        {outline ? (
          <>
            {outline.warnings.length ? (
              <ul className="space-y-1 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                {outline.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : null}

            {outline.fileUrl ? (
              <a
                href={resolveUploadUrl(outline.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
              >
                <FileText className="h-4 w-4" />
                {outline.fileName || 'View uploaded outline'}
              </a>
            ) : null}

            <Collapsible
              title="Review course types"
              summary={outline.categoriesReviewed ? 'Reviewed' : 'Needs your review'}
            >
              <div className="space-y-3">
                {semesters.map((semester) => (
                  <div key={semester.semester} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                    <p className="text-sm font-bold text-slate-700">
                      Semester {semester.semester}
                      <span className="ml-2 text-xs font-medium text-slate-400">
                        {semester.declaredCredits ?? semester.courses.reduce((sum, course) => sum + course.creditHours, 0)} credit hours
                      </span>
                    </p>
                    <ul className="mt-3 divide-y divide-slate-100">
                      {semester.courses.map((course, index) => (
                        <li key={`${semester.semester}-${course.name}-${index}`} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center">
                          <p className="min-w-0 flex-1 text-sm font-medium text-slate-700">
                            {course.name}
                            {course.slot ? <span className="ml-2 text-xs text-slate-400">{course.slot}</span> : null}
                            <span className="ml-2 text-xs text-slate-400">{course.creditHours} CH</span>
                          </p>
                          <select
                            value={course.category}
                            onChange={(event) => setCategory(semester.semester, index, event.target.value as OutlineCategory)}
                            aria-label={`Course type for ${course.name}`}
                            className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 sm:w-56"
                          >
                            {CATEGORY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {error ? (
                  <p className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving || (outline.categoriesReviewed && !isDirty)}
                  className="inline-flex items-center rounded-[1.25rem] bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {outline.categoriesReviewed ? 'Save changes' : 'Confirm course types'}
                </button>
              </div>
            </Collapsible>
          </>
        ) : null}
      </div>
    </Collapsible>
  );
}
