import { useEffect, useMemo, useState } from 'react';
import { Check, Mail, Pencil, Search, X } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import type { ApplicationCourseSummary } from '../../types/application';
import { getCourseDisplayTitle } from '../../types/course';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const universityName = (course: ApplicationCourseSummary) =>
  typeof course.universityId === 'object' && course.universityId ? course.universityId.name : '';

/** Lets admins record who teaches each host-university course, so arrivals can be announced to them. */
export default function HostCourseInstructors() {
  const [courses, setCourses] = useState<ApplicationCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState({ instructorName: '', instructorEmail: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi
      .getHostCourses()
      .then(setCourses)
      .catch(() => setError('Unable to load host courses.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (showMissingOnly && course.instructorEmail) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [getCourseDisplayTitle(course), course.code, universityName(course), course.instructorName, course.instructorEmail]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [courses, search, showMissingOnly]);

  const missingCount = courses.filter((course) => !course.instructorEmail).length;

  const startEditing = (course: ApplicationCourseSummary) => {
    setEditingId(course._id);
    setDraft({ instructorName: course.instructorName || '', instructorEmail: course.instructorEmail || '' });
    setError('');
  };

  const save = async (courseId: string) => {
    const instructorEmail = draft.instructorEmail.trim();
    if (instructorEmail && !EMAIL_PATTERN.test(instructorEmail)) {
      setError('Enter a valid instructor email or leave it empty.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await adminApi.updateCourseInstructor(courseId, {
        instructorName: draft.instructorName.trim(),
        instructorEmail,
      });
      setCourses((current) => current.map((course) => (course._id === courseId ? { ...course, ...updated } : course)));
      setEditingId('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save instructor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black text-maroon">Host Course Instructors</h3>
          <p className="mt-1 text-sm font-medium text-body-text">
            Instructors listed here are emailed when an exchange student enrolled in their course arrives.
            {missingCount ? ` ${missingCount} course${missingCount === 1 ? '' : 's'} still missing an email.` : ''}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 md:max-w-md">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-body-text opacity-40" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by course, university or instructor"
              className="w-full rounded-xl border border-light-color/50 bg-white py-3 pl-11 pr-4 font-medium text-maroon placeholder:text-body-text placeholder:opacity-40 focus:border-maroon/20 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-body-text">
            <input
              type="checkbox"
              checked={showMissingOnly}
              onChange={(event) => setShowMissingOnly(event.target.checked)}
              className="h-4 w-4 accent-maroon"
            />
            Only show courses without an instructor email
          </label>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600">{error}</div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-light-color bg-slate-50 px-6 py-10 text-center text-sm text-body-text">
          {courses.length ? 'No matching host courses.' : 'No host courses have been imported yet.'}
        </p>
      ) : (
        <ul className="max-h-[32rem] divide-y divide-light-color/60 overflow-y-auto rounded-2xl border border-light-color/50">
          {filtered.map((course) => (
            <li key={course._id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="font-black text-maroon">
                  {course.code ? `${course.code} · ` : ''}
                  {getCourseDisplayTitle(course)}
                </p>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {universityName(course) || 'Host university'}
                </p>
              </div>

              {editingId === course._id ? (
                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                  <input
                    type="text"
                    value={draft.instructorName}
                    onChange={(event) => setDraft((current) => ({ ...current, instructorName: event.target.value }))}
                    placeholder="Instructor name"
                    className="rounded-lg border border-light-color bg-slate-50 px-3 py-2 text-sm font-medium text-maroon focus:outline-none focus:ring-2 focus:ring-accent-yellow/50"
                  />
                  <input
                    type="email"
                    value={draft.instructorEmail}
                    onChange={(event) => setDraft((current) => ({ ...current, instructorEmail: event.target.value }))}
                    placeholder="instructor@host.edu"
                    className="rounded-lg border border-light-color bg-slate-50 px-3 py-2 text-sm font-medium text-maroon focus:outline-none focus:ring-2 focus:ring-accent-yellow/50"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void save(course._id)}
                      disabled={saving}
                      className="inline-flex items-center gap-1 rounded-lg bg-accent-yellow px-3 py-2 text-xs font-bold text-maroon disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId('')}
                      disabled={saving}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-body-text"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 md:justify-end">
                  {course.instructorEmail ? (
                    <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4 shrink-0 text-maroon/50" />
                      <span className="truncate">
                        {course.instructorName ? `${course.instructorName} · ` : ''}
                        {course.instructorEmail}
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">No instructor email</span>
                  )}
                  <button
                    type="button"
                    onClick={() => startEditing(course)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-maroon transition hover:bg-slate-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {course.instructorEmail ? 'Edit' : 'Add'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
