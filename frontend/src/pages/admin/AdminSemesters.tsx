import { useEffect, useState, type FormEvent } from 'react';
import { CalendarRange, Pencil, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import Notice from '../../components/Notice';
import { semesterApi, type SemesterInput, type SemesterRecord } from '../../lib/adminApi';
import { parseApiError } from '../../lib/errorUtils';

const emptyForm: SemesterInput = { name: '', startDate: '', endDate: '' };

const toInputDate = (value: string) => new Date(value).toISOString().slice(0, 10);
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const inputClass =
  'w-full px-4 py-3 bg-slate-50 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:border-accent-yellow transition-all font-medium text-admin';
const labelClass = 'block text-xs font-bold text-admin/60 uppercase tracking-widest mb-2';

export default function AdminSemesters() {
  const [semesters, setSemesters] = useState<SemesterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SemesterInput>(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<SemesterRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fail = (error: unknown) => {
    const parsed = parseApiError(error);
    setErrorMessage([parsed.message, parsed.solution].filter(Boolean).join(' '));
  };

  const load = async () => {
    try {
      setSemesters(await semesterApi.list());
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (editingId) {
        await semesterApi.update(editingId, form);
        setSuccessMessage('Semester updated.');
      } else {
        await semesterApi.create(form);
        setSuccessMessage('Semester added.');
      }
      reset();
      await load();
    } catch (error) {
      fail(error);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (semester: SemesterRecord) => {
    setEditingId(semester._id);
    setForm({ name: semester.name, startDate: toInputDate(semester.startDate), endDate: toInputDate(semester.endDate) });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await semesterApi.remove(pendingDelete._id);
      setSuccessMessage('Semester deleted.');
      if (editingId === pendingDelete._id) reset();
      setPendingDelete(null);
      await load();
    } catch (error) {
      setPendingDelete(null);
      fail(error);
    } finally {
      setSaving(false);
    }
  };

  const today = Date.now();
  const stateOf = (semester: SemesterRecord) =>
    new Date(semester.endDate).getTime() < today
      ? 'Ended'
      : new Date(semester.startDate).getTime() > today
        ? 'Upcoming'
        : 'Current';

  return (
    <div className="space-y-6 animate-fade-in relative z-0">
      <div className="glass-card rounded-[2rem] bg-white p-6 md:p-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-admin">
            <CalendarRange className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-admin mb-1">Semesters</h2>
            <p className="text-body-text font-medium md:text-lg">
              A student whose application is rejected, not recommended or completed cannot apply again until the
              semester it closed in has ended. Semesters cannot overlap.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[2rem] bg-white p-6 md:p-8 shadow-sm">
        <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4 md:grid-cols-4 md:items-end">
          <div>
            <label className={labelClass} htmlFor="semester-name">Name</label>
            <input
              id="semester-name"
              required
              maxLength={60}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={inputClass}
              placeholder="Fall 2026"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="semester-start">Start date</label>
            <input
              id="semester-start"
              type="date"
              required
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="semester-end">End date</label>
            <input
              id="semester-end"
              type="date"
              required
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-admin px-5 py-3 text-sm font-bold text-white transition hover:bg-admin-hover disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add semester'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={reset}
                disabled={saving}
                className="rounded-xl border border-light-color px-5 py-3 text-sm font-bold text-admin transition hover:bg-slate-50"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="glass-card rounded-[2rem] bg-white p-6 md:p-8 shadow-sm">
        {loading ? (
          <div className="h-16 animate-pulse rounded-xl border border-light-color/30 bg-slate-50" />
        ) : semesters.length === 0 ? (
          <p className="text-sm font-semibold text-slate-600">
            No semesters yet. Until you add them, rejected students can apply again straight away.
          </p>
        ) : (
          <ul className="divide-y divide-light-color/50">
            {semesters.map((semester) => (
              <li key={semester._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-bold text-admin">{semester.name}</p>
                  <p className="text-sm font-medium text-body-text">
                    {formatDate(semester.startDate)} to {formatDate(semester.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-600">
                    {stateOf(semester)}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(semester)}
                    aria-label={`Edit ${semester.name}`}
                    className="rounded-lg p-2 text-admin transition hover:bg-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(semester)}
                    aria-label={`Delete ${semester.name}`}
                    className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingDelete ? (
        <ConfirmDialog
          title={`Delete ${pendingDelete.name}?`}
          message="Students locked out because of this semester will be able to apply again straight away."
          confirmLabel="Delete semester"
          busy={saving}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}

      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      {successMessage ? <Notice tone="success">{successMessage}</Notice> : null}
    </div>
  );
}
