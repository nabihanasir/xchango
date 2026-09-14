import { useEffect, useState } from 'react';
import { FileDown, LoaderCircle, Save, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resultsApi } from '../../lib/api';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type { GradableItem, ResultStatus } from '../../types/result';
import { formatDisplayDate, getResultStatusClasses } from '../../utils/result';

interface Draft {
  grade: string;
  marks: string;
  remarks: string;
  file: File | null;
}

const getCourseTitle = (course: GradableItem['hostCourseId']) => course?.title || course?.name || course?.code || 'Untitled course';

const buildDraft = (item: GradableItem): Draft => ({
  grade: item.result?.grade || '',
  marks: item.result?.marks != null ? String(item.result.marks) : '',
  remarks: item.result?.remarks || '',
  file: null,
});

export default function AdvisorResults() {
  const { user } = useAuth();
  const [items, setItems] = useState<GradableItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  const loadItems = async () => {
    if (!user?.token) {
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      const response = await resultsApi.getAdvisorGradableItems(user.token);
      setItems(response);
      setDrafts(
        response.reduce<Record<string, Draft>>((acc, item) => {
          acc[item.courseRequestItemId] = buildDraft(item);
          return acc;
        }, {})
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load enrolled courses.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [user?.token]);

  const updateDraft = (itemId: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
  };

  const handleSubmit = async (itemId: string, status: ResultStatus) => {
    if (!user?.token) {
      return;
    }

    const draft = drafts[itemId];
    if (!draft?.grade.trim()) {
      setError('Enter a grade before saving.');
      return;
    }

    try {
      setSavingId(`${itemId}-${status}`);
      setError('');
      await resultsApi.upsertResult(user.token, itemId, {
        grade: draft.grade.trim(),
        marks: draft.marks.trim() ? Number(draft.marks) : null,
        remarks: draft.remarks.trim(),
        status,
        file: draft.file,
      });
      await loadItems();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the result.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-[2.5rem] p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent-yellow">Results</p>
        <h1 className="mt-3 text-3xl font-black text-slate-800 md:text-4xl">Grade your students' host courses</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">
          Only approved course enrollments for students assigned to you appear here.
        </p>
      </section>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="glass-card rounded-[2rem] p-8 text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length ? (
        <div className="space-y-6">
          {items.map((item) => {
            const draft = drafts[item.courseRequestItemId] || buildDraft(item);
            const isSavingDraft = savingId === `${item.courseRequestItemId}-draft`;
            const isPublishing = savingId === `${item.courseRequestItemId}-published`;

            return (
              <article key={item.courseRequestItemId} className="glass-card rounded-[2.25rem] p-6 md:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      {item.result ? (
                        <span className={`rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.25em] ${getResultStatusClasses(item.result.status)}`}>
                          {item.result.status}
                        </span>
                      ) : (
                        <span className="rounded-full border border-dashed border-slate-300 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                          Not graded
                        </span>
                      )}
                      {item.result ? (
                        <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                          Updated {formatDisplayDate(item.result.updatedAt)}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-4 text-xl font-black text-slate-800">
                      {item.hostCourseId.code} · {getCourseTitle(item.hostCourseId)}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {item.student.name} · {item.student.email}
                      {item.student.sapId ? ` · SAP ${item.student.sapId}` : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[160px_160px_minmax(0,1fr)]">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Grade</label>
                    <input
                      type="text"
                      value={draft.grade}
                      onChange={(event) => updateDraft(item.courseRequestItemId, { grade: event.target.value })}
                      placeholder="e.g. A"
                      className="mt-2 w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Marks (0-100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={draft.marks}
                      onChange={(event) => updateDraft(item.courseRequestItemId, { marks: event.target.value })}
                      placeholder="Optional"
                      className="mt-2 w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Marksheet (optional)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(event) => updateDraft(item.courseRequestItemId, { file: event.target.files?.[0] || null })}
                      className="mt-2 w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-bold"
                    />
                    {item.result?.resultFileUrl ? (
                      <a
                        href={resolveUploadUrl(item.result.resultFileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        View current file
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Remarks</label>
                  <textarea
                    value={draft.remarks}
                    onChange={(event) => updateDraft(item.courseRequestItemId, { remarks: event.target.value })}
                    rows={2}
                    className="mt-2 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-accent-yellow/60 focus:ring-4 focus:ring-accent-yellow/10"
                    placeholder="Optional feedback for the student."
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSubmit(item.courseRequestItemId, 'draft')}
                    disabled={isSavingDraft || isPublishing}
                    className="inline-flex items-center rounded-[1.25rem] bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    {isSavingDraft ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save draft
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmit(item.courseRequestItemId, 'published')}
                    disabled={isSavingDraft || isPublishing}
                    className="inline-flex items-center rounded-[1.25rem] bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {isPublishing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Publish to student
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] px-6 py-12 text-center">
          <h2 className="text-2xl font-black text-slate-800">No enrolled courses to grade</h2>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Courses appear here once a course request item is approved for one of your assigned students.
          </p>
        </div>
      )}
    </div>
  );
}
