import { useEffect, useMemo, useState } from 'react';
import { FileDown, LoaderCircle, Paperclip, Save, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resultsApi, verificationApi } from '../../lib/api';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type { ExamVerification, GradableItem, ResultStatus, StudentSummary } from '../../types/result';
import { formatDisplayDate, getResultStatusClasses } from '../../utils/result';
import Notice from '../../components/Notice';
import StudentDocumentReview from '../../components/results/StudentDocumentReview';

interface Draft {
  grade: string;
  marks: string;
  remarks: string;
  file: File | null;
}

interface StudentGroup {
  student: StudentSummary;
  items: GradableItem[];
  verification: ExamVerification | null;
}

const getCourseTitle = (course: GradableItem['hostCourseId']) => course?.title || course?.name || course?.code || 'Untitled course';

const buildDraft = (item: GradableItem): Draft => ({
  grade: item.result?.grade || '',
  marks: item.result?.marks != null ? String(item.result.marks) : '',
  remarks: item.result?.remarks || '',
  file: null,
});

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

const verificationStudentId = (verification: ExamVerification) =>
  typeof verification.studentId === 'string' ? verification.studentId : verification.studentId._id;

/** Grading opens once the student has uploaded a document that was not sent back. */
const canGrade = (verification: ExamVerification | null) => Boolean(verification) && verification?.status !== 'returned';

const DOT_COLOURS: Record<string, string> = {
  verified: 'bg-emerald-500',
  submitted: 'bg-amber-500',
  returned: 'bg-red-500',
  none: 'bg-slate-300',
};

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

export default function AdvisorResults() {
  const { user } = useAuth();
  const [items, setItems] = useState<GradableItem[]>([]);
  const [verifications, setVerifications] = useState<ExamVerification[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    if (!user?.token) {
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      const [gradable, documents] = await Promise.all([
        resultsApi.getAdvisorGradableItems(user.token),
        verificationApi.getAdvisorVerifications(user.token).catch(() => [] as ExamVerification[]),
      ]);
      setItems(gradable);
      setVerifications(documents);
      setDrafts(
        gradable.reduce<Record<string, Draft>>((acc, item) => {
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
    void loadData();
  }, [user?.token]);

  const groups = useMemo<StudentGroup[]>(() => {
    const byStudent = new Map<string, StudentGroup>();
    const documentFor = (studentId: string) => verifications.find((doc) => verificationStudentId(doc) === studentId) || null;

    for (const item of items) {
      const existing = byStudent.get(item.student._id);
      if (existing) {
        existing.items.push(item);
      } else {
        byStudent.set(item.student._id, { student: item.student, items: [item], verification: documentFor(item.student._id) });
      }
    }

    // A document can arrive from a student who has no approved course yet; keep it reviewable.
    for (const document of verifications) {
      const studentId = verificationStudentId(document);
      if (!byStudent.has(studentId) && typeof document.studentId !== 'string') {
        byStudent.set(studentId, { student: document.studentId, items: [], verification: document });
      }
    }

    return [...byStudent.values()];
  }, [items, verifications]);

  const selected = groups.find((group) => group.student._id === selectedId) || groups[0] || null;

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
    if (!/^(A\+?|A-|B\+?|B-|C\+?|C-|D\+?|D-|F|P|NP|W|I|[0-9]{1,3}(\.[0-9]{1,2})?%?)$/i.test(draft.grade.trim())) {
      setError('Grade must be a letter grade such as A, B+ or F, or a numeric score.');
      return;
    }
    if (draft.marks.trim()) {
      const marks = Number(draft.marks);
      if (!Number.isFinite(marks) || marks < 0 || marks > 100) {
        setError('Marks must be a number between 0 and 100.');
        return;
      }
    }
    if (draft.remarks.trim().length > 1000) {
      setError('Remarks must be 1000 characters or fewer.');
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
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the result.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-[2.5rem] p-8 md:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent-yellow">Results</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-800 md:text-4xl">Grade your students' host courses</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">
          Pick a student, check the document they brought back from the host university, then enter their grades. Grading
          opens once the student has uploaded that document.
        </p>
      </section>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {isLoading ? (
        <div className="glass-card rounded-[2rem] p-8 text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
        </div>
      ) : selected ? (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <nav aria-label="Students" className="space-y-2">
            {groups.map((group) => {
              const documentState = group.verification?.status || 'none';
              const graded = group.items.filter((item) => item.result).length;
              const isSelected = group.student._id === selected.student._id;
              return (
                <button
                  key={group.student._id}
                  type="button"
                  aria-current={isSelected}
                  onClick={() => setSelectedId(group.student._id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left transition ${
                    isSelected ? 'border-teal-700 ring-1 ring-teal-700' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOURS[documentState]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-slate-900">{group.student.name}</span>
                    <span className="block text-xs font-medium text-slate-500">
                      {group.items.length ? `${graded} of ${group.items.length} graded` : 'No approved courses'}
                    </span>
                  </span>
                </button>
              );
            })}
            <p className="px-1 pt-1 text-xs font-medium text-slate-500">
              Dot: green = document verified, amber = waiting for review, red = returned, grey = not uploaded.
            </p>
          </nav>

          <section className="glass-card space-y-5 rounded-[2rem] p-6 lg:p-8">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-50 text-lg font-bold text-teal-700">
                {getInitials(selected.student.name)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-slate-900">{selected.student.name}</h2>
                <p className="truncate text-sm text-slate-500">
                  {selected.student.email}
                  {selected.student.sapId ? ` · SAP ${selected.student.sapId}` : ''}
                </p>
              </div>
            </div>

            <StudentDocumentReview verification={selected.verification} onReviewed={() => void loadData()} />

            {selected.items.length ? (
              <div className="space-y-3">
                {!canGrade(selected.verification) ? (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    Grades are locked until the student uploads a verification document.
                  </p>
                ) : null}

                {selected.items.map((item) => {
                  const id = item.courseRequestItemId;
                  const draft = drafts[id] || buildDraft(item);
                  const locked = !canGrade(selected.verification);
                  const isSavingDraft = savingId === `${id}-draft`;
                  const isPublishing = savingId === `${id}-published`;
                  const busy = isSavingDraft || isPublishing;

                  return (
                    <article key={id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-900">
                          {item.hostCourseId.code} <span className="font-medium text-slate-500">· {getCourseTitle(item.hostCourseId)}</span>
                        </h3>
                        {item.result ? (
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${getResultStatusClasses(item.result.status)}`}>
                            {item.result.status === 'published' ? 'Published' : 'Draft'} · {formatDisplayDate(item.result.updatedAt)}
                          </span>
                        ) : (
                          <span className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-bold text-slate-500">
                            Not graded
                          </span>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[6rem_6rem_minmax(0,1fr)]">
                        <label className="space-y-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Grade
                          <input
                            type="text"
                            value={draft.grade}
                            disabled={locked}
                            maxLength={6}
                            placeholder="e.g. A"
                            onChange={(event) => updateDraft(id, { grade: event.target.value })}
                            className={inputClasses}
                          />
                        </label>
                        <label className="space-y-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Marks
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={draft.marks}
                            disabled={locked}
                            placeholder="0-100"
                            onChange={(event) => updateDraft(id, { marks: event.target.value })}
                            className={inputClasses}
                          />
                        </label>
                        <label className="space-y-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Remarks
                          <input
                            type="text"
                            value={draft.remarks}
                            disabled={locked}
                            placeholder="Optional note for the student"
                            onChange={(event) => updateDraft(id, { remarks: event.target.value })}
                            className={inputClasses}
                          />
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <label
                          className={`inline-flex items-center gap-2 text-sm font-bold ${
                            locked ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-teal-700 hover:text-teal-900'
                          }`}
                        >
                          <Paperclip className="h-4 w-4" />
                          {draft.file ? draft.file.name : 'Attach marksheet (optional)'}
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={locked}
                            className="sr-only"
                            onChange={(event) => updateDraft(id, { file: event.target.files?.[0] || null })}
                          />
                        </label>
                        {item.result?.resultFileUrl ? (
                          <a
                            href={resolveUploadUrl(item.result.resultFileUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700"
                          >
                            <FileDown className="h-4 w-4" />
                            Current marksheet
                          </a>
                        ) : null}
                        <span className="flex-1" />
                        <button
                          type="button"
                          onClick={() => void handleSubmit(id, 'draft')}
                          disabled={locked || busy}
                          className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSavingDraft ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Save draft
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSubmit(id, 'published')}
                          disabled={locked || busy}
                          className="inline-flex items-center rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPublishing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Publish
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-500">This student has no approved courses to grade yet.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] px-6 py-12 text-center">
          <h2 className="text-2xl font-bold text-slate-800">No enrolled courses to grade</h2>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Courses appear here once a course request item is approved for one of your assigned students.
          </p>
        </div>
      )}
    </div>
  );
}
