import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, LoaderCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { equivalencyApi } from '../../lib/api';
import type { CourseSummary } from '../../types/equivalency';
import { getUniversityName } from '../../utils/equivalency';

export default function CourseEquivalencyBrowse() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCourses = async () => {
      if (!user?.token) {
        setIsLoading(false);
        return;
      }

      try {
        setError('');
        const response = await equivalencyApi.getHostCourses(user.token);
        setCourses(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load host courses.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadCourses();
  }, [user?.token]);

  const selectedCourses = useMemo(
    () => courses.filter((course) => selectedCourseIds.includes(course._id)),
    [courses, selectedCourseIds]
  );

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId]
    );
  };

  const handleSubmit = async () => {
    if (!user?.token || !selectedCourseIds.length) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await equivalencyApi.createStudentRequest(user.token, selectedCourseIds);
      setSelectedCourseIds([]);
      navigate('/dashboard/equivalency/requests');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="glass-card rounded-[2rem] p-8">
        <h2 className="text-2xl font-black text-slate-800">Sign in to request course equivalency</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#060424] via-[#090638] to-[#1A1558] p-8 md:p-10 text-white shadow-2xl shadow-dark-blue/20">
        <div className="absolute inset-y-0 right-0 w-72 bg-accent-yellow/10 blur-[90px]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-accent-yellow">
              <Sparkles className="h-4 w-4" />
              AI-Assisted Equivalency
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">Browse host courses and build your request</h1>
            <p className="max-w-xl text-sm font-medium leading-7 text-slate-300 md:text-base">
              Select the host-university courses you want evaluated for home-university credit. Your advisor will review each pairing and run the AI match manually before deciding.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Available</p>
              <p className="mt-2 text-3xl font-black">{courses.length}</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Selected</p>
              <p className="mt-2 text-3xl font-black">{selectedCourseIds.length}</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Host University Courses</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Review outlines, credit hours, and descriptions before selecting.</p>
          </div>

          {isLoading ? (
            <div className="glass-card rounded-[2rem] p-8 text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {courses.map((course) => {
                const isSelected = selectedCourseIds.includes(course._id);

                return (
                  <button
                    key={course._id}
                    type="button"
                    onClick={() => toggleCourse(course._id)}
                    className={`glass-card rounded-[2rem] p-6 text-left transition-all duration-300 ${
                      isSelected
                        ? 'border-accent-yellow shadow-[0_20px_50px_rgba(6,4,36,0.12)] ring-2 ring-accent-yellow/20'
                        : 'hover:-translate-y-1'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent-yellow">{course.code}</p>
                        <h3 className="mt-2 text-xl font-black text-slate-800">{course.name}</h3>
                      </div>
                      {isSelected ? (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2 className="h-5 w-5" />
                        </span>
                      ) : (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <BookOpen className="h-5 w-5" />
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-2">{course.creditHours} credit hours</span>
                      <span className="rounded-full bg-slate-100 px-3 py-2">{getUniversityName(course.universityId)}</span>
                    </div>

                    <p className="mt-5 line-clamp-3 text-sm font-medium leading-7 text-slate-600">
                      {course.description || 'No description provided for this host course.'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="glass-card h-fit rounded-[2rem] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent-yellow">Request Preview</p>
          <h2 className="mt-3 text-2xl font-black text-slate-800">Selected courses</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Your advisor will receive the selected host courses together with suggested home-course equivalents.
          </p>

          <div className="mt-6 space-y-4">
            {selectedCourses.length ? (
              selectedCourses.map((course) => (
                <div key={course._id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">{course.code}</p>
                  <h3 className="mt-2 text-base font-black text-slate-800">{course.name}</h3>
                  <p className="mt-2 text-sm font-medium text-slate-500">{course.creditHours} credit hours</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-4 py-8 text-center text-sm font-medium text-slate-500">
                Pick one or more host courses to build your request.
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            className="mt-6"
            onClick={handleSubmit}
            disabled={!selectedCourseIds.length || isSubmitting}
          >
            {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : 'Submit request'}
            {!isSubmitting ? <ArrowRight className="ml-2 h-5 w-5" /> : null}
          </Button>
        </aside>
      </div>
    </div>
  );
}
