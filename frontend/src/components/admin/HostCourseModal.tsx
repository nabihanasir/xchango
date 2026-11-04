import { useEffect, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import Modal from '../Modal';
import Notice from '../Notice';
import { adminApi, type UniversityRecord } from '../../lib/adminApi';
import { fieldClass, labelClass } from './EditorFields';

interface HostCourseModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Adds a course taught at a partner university. Host courses are what students request equivalency for. */
export default function HostCourseModal({ onClose, onCreated }: HostCourseModalProps) {
  const [universities, setUniversities] = useState<UniversityRecord[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  const [form, setForm] = useState({
    universityId: '',
    code: '',
    title: '',
    creditHours: '3',
    description: '',
    instructorName: '',
    instructorEmail: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getUniversities()
      .then(setUniversities)
      .catch(() => setError('Unable to load universities.'))
      .finally(() => setLoadingUniversities(false));
  }, []);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (form.instructorEmail.trim() && !EMAIL_PATTERN.test(form.instructorEmail.trim())) {
      setError('Enter a valid instructor email or leave it empty.');
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.createHostCourse({
        universityId: form.universityId,
        code: form.code,
        title: form.title,
        creditHours: Number(form.creditHours),
        description: form.description,
        instructorName: form.instructorName,
        instructorEmail: form.instructorEmail,
      });
      onCreated();
      onClose();
    } catch (err) {
      const apiError = err as { message?: string; reason?: string };
      setError([apiError.message, apiError.reason].filter(Boolean).join(' ') || 'Unable to add the course.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} widthClass="max-w-2xl" locked={submitting} labelledBy="host-course-title">
      <header className="flex items-center justify-between border-b border-light-color/60 px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-maroon">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 id="host-course-title" className="text-2xl font-bold text-maroon">
              New Host Course
            </h2>
            <p className="text-sm font-medium text-body-text">A course taught at a partner university.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close"
          className="rounded-xl p-2 text-maroon/40 transition-all hover:bg-slate-100 hover:text-maroon disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-8">
        <label className="block">
          <span className={labelClass}>University</span>
          <select
            required
            value={form.universityId}
            onChange={(event) => set('universityId', event.target.value)}
            disabled={loadingUniversities}
            className={fieldClass}
          >
            <option value="" disabled>
              {loadingUniversities ? 'Loading...' : universities.length ? 'Select a university' : 'No universities yet'}
            </option>
            {universities.map((university) => (
              <option key={university._id} value={university._id}>
                {university.name}
                {university.countryId ? ` (${university.countryId.name})` : ''}
                {university.status === 'draft' ? ' - draft' : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <label className="block md:col-span-1">
            <span className={labelClass}>Course code</span>
            <input
              type="text"
              required
              value={form.code}
              onChange={(event) => set('code', event.target.value)}
              placeholder="e.g. MMU-CS101"
              className={fieldClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className={labelClass}>Title</span>
            <input
              type="text"
              required
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="e.g. Database Systems"
              className={fieldClass}
            />
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>Description</span>
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder="What the course covers. The AI matcher compares this with home courses."
            className={`${fieldClass} resize-none`}
          />
        </label>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <label className="block">
            <span className={labelClass}>Credit hours</span>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={form.creditHours}
              onChange={(event) => set('creditHours', event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Instructor name</span>
            <input type="text" value={form.instructorName} onChange={(event) => set('instructorName', event.target.value)} className={fieldClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Instructor email</span>
            <input
              type="email"
              value={form.instructorEmail}
              onChange={(event) => set('instructorEmail', event.target.value)}
              placeholder="instructor@university.edu"
              className={fieldClass}
            />
          </label>
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl bg-slate-100 px-6 py-2.5 font-bold text-body-text transition-all hover:bg-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-accent-yellow px-6 py-2.5 font-bold text-maroon shadow-lg shadow-accent-yellow/20 transition-all hover:bg-yellow-default disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Course'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
