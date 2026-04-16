import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import DataTable from '../../components/admin/DataTable';
import { adminApi } from '../../lib/adminApi';
import type { ApplicationCourseSummary } from '../../types/application';
import { getCourseDisplayTitle } from '../../types/course';

type CourseFormState = {
  title: string;
  description: string;
  creditHours: string;
};

const emptyForm = (): CourseFormState => ({
  title: '',
  description: '',
  creditHours: '3',
});

export default function AdminCourses() {
  const [courses, setCourses] = useState<ApplicationCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [form, setForm] = useState<CourseFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState('');

  const loadCourses = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await adminApi.getCourses();
      setCourses(data);
    } catch (loadError) {
      setCourses([]);
      setError('Unable to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...courses].sort((left, right) =>
      getCourseDisplayTitle(left).localeCompare(getCourseDisplayTitle(right))
    );

    if (!query) {
      return sorted;
    }

    return sorted.filter((course) => {
      const title = getCourseDisplayTitle(course).toLowerCase();
      const description = (course.description || '').toLowerCase();
      const createdBy = typeof course.createdBy === 'object' && course.createdBy
        ? course.createdBy.name.toLowerCase()
        : '';

      return title.includes(query) || description.includes(query) || createdBy.includes(query);
    });
  }, [courses, search]);

  const openCreateModal = () => {
    setEditingCourseId(null);
    setForm(emptyForm());
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (course: ApplicationCourseSummary) => {
    setEditingCourseId(course._id);
    setForm({
      title: course.title || course.name || '',
      description: course.description || '',
      creditHours: String(course.creditHours || 3),
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) {
      return;
    }

    setIsModalOpen(false);
    setEditingCourseId(null);
    setForm(emptyForm());
    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    const title = form.title.trim();
    const creditHours = Number(form.creditHours);

    if (!title) {
      setFormError('Title is required.');
      return;
    }

    if (!Number.isFinite(creditHours) || creditHours <= 0) {
      setFormError('Credit hours must be greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title,
        description: form.description.trim(),
        creditHours,
      };

      if (editingCourseId) {
        await adminApi.updateCourse(editingCourseId, payload);
      } else {
        await adminApi.createCourse(payload);
      }

      closeModal();
      await loadCourses();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Unable to save course.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (courseId: string) => {
    const confirmed = window.confirm('Delete this home course? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setDeletingCourseId(courseId);
      await adminApi.deleteCourse(courseId);
      await loadCourses();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete course.');
    } finally {
      setDeletingCourseId('');
    }
  };

  const columns = [
    {
      header: 'Title',
      accessor: 'title',
      render: (_value: string, row: ApplicationCourseSummary) => (
        <div>
          <p className="font-black text-dark-blue">{getCourseDisplayTitle(row)}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
            {row.isHomeCourse ? 'Home Course' : 'Course'}
          </p>
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (value: string) => (
        <span className="max-w-[24rem] block text-sm leading-6 text-slate-600">
          {value || 'No description provided.'}
        </span>
      ),
    },
    {
      header: 'Credit Hours',
      accessor: 'creditHours',
      render: (value: number) => <span className="font-black text-dark-blue">{value}</span>,
    },
    {
      header: 'Created By',
      accessor: 'createdBy',
      render: (value: ApplicationCourseSummary['createdBy']) =>
        typeof value === 'object' && value ? (
          <span className="font-semibold text-slate-700">{value.name}</span>
        ) : (
          <span className="text-slate-400">System</span>
        ),
    },
    {
      header: 'Updated',
      accessor: 'updatedAt',
      render: (value: string) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      header: 'Actions',
      accessor: '_id',
      render: (_value: string, row: ApplicationCourseSummary) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-dark-blue transition hover:bg-slate-200"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(row._id)}
            disabled={deletingCourseId === row._id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deletingCourseId === row._id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="relative z-0 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between rounded-[2rem] border-b border-light-color/50 bg-white p-6 md:p-8 glass-card">
        <div>
          <h2 className="mb-2 text-3xl font-black text-dark-blue">Manage Home Courses</h2>
          <p className="mt-1 text-body-text font-medium md:text-lg">
            Maintain the central list of home courses used by advisors during equivalency review.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-dark-blue px-5 py-2.5 font-bold text-white shadow-lg shadow-dark-blue/20 transition-all hover:bg-navy-hover"
        >
          <Plus className="h-5 w-5" />
          Add Course
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 font-bold text-red-600">
          <span>{error}</span>
        </div>
      ) : null}

      <div className="glass-card rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black text-dark-blue">Home Course Catalog</h3>
            <p className="mt-1 text-sm font-medium text-body-text">
              Search, update, and remove home courses used by the advisor equivalency workflow.
            </p>
          </div>
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-body-text opacity-40" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or description"
              className="w-full rounded-xl border border-light-color/50 bg-white py-3 pl-11 pr-4 font-medium text-dark-blue placeholder:text-body-text placeholder:opacity-40 focus:border-dark-blue/20 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl border border-light-color/30 bg-slate-50" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-light-color bg-slate-50 px-6 py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="text-xl font-bold text-dark-blue">
              {courses.length ? 'No matching courses' : 'No home courses yet'}
            </h3>
            <p className="mt-2 text-body-text">
              {courses.length
                ? 'Try a different search term.'
                : 'Add the first home course to seed the advisor dropdown.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-light-color/50">
            <DataTable columns={columns} data={filteredCourses} />
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-dark-blue/80 backdrop-blur-md"
            onClick={() => !submitting && closeModal()}
          />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-2xl animate-fade-in-up">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-light-color/60 bg-white/80 px-8 py-6 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-dark-blue">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-dark-blue">
                    {editingCourseId ? 'Edit Home Course' : 'New Home Course'}
                  </h2>
                  <p className="text-sm font-medium text-body-text">
                    Courses are automatically available to advisors and students in view-only mode.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-xl p-2 text-dark-blue/40 transition-all hover:bg-slate-100 hover:text-dark-blue disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5 p-8">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-dark-blue/60">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="e.g. Data Structures"
                  className="w-full rounded-xl border border-light-color bg-slate-50 px-4 py-3 font-medium text-dark-blue transition-all focus:border-accent-yellow/50 focus:outline-none focus:ring-2 focus:ring-accent-yellow/50"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-dark-blue/60">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Short description of the course..."
                    className="w-full resize-none rounded-xl border border-light-color bg-slate-50 px-4 py-3 font-medium text-dark-blue transition-all focus:border-accent-yellow/50 focus:outline-none focus:ring-2 focus:ring-accent-yellow/50"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-dark-blue/60">
                    Credit Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.creditHours}
                    onChange={(event) => setForm((current) => ({ ...current, creditHours: event.target.value }))}
                    className="w-full rounded-xl border border-light-color bg-slate-50 px-4 py-3 font-medium text-dark-blue transition-all focus:border-accent-yellow/50 focus:outline-none focus:ring-2 focus:ring-accent-yellow/50"
                    required
                  />
                </div>
              </div>

              {formError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {formError}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl bg-slate-100 px-6 py-2.5 font-bold text-body-text transition-all hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-accent-yellow px-6 py-2.5 font-bold text-dark-blue shadow-lg shadow-accent-yellow/20 transition-all hover:bg-yellow-default disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
