import { useEffect, useState } from 'react';
import { FileDown, GraduationCap, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resultsApi } from '../../lib/api';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type { StudentResult } from '../../types/result';
import { formatDisplayDate, getResultStatusClasses } from '../../utils/result';

const getCourseTitle = (course: StudentResult['hostCourseId']) => course?.title || course?.name || course?.code || 'Untitled course';

export default function StudentResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResults = async () => {
      if (!user?.token) {
        setIsLoading(false);
        return;
      }

      try {
        setError('');
        const response = await resultsApi.getStudentResults(user.token);
        setResults(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your results.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadResults();
  }, [user?.token]);

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-[2.5rem] p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent-yellow">Academic Results</p>
        <h1 className="mt-3 text-3xl font-black text-slate-800 md:text-4xl">Your host university results</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">
          Grades published by your advisor for the courses you are enrolled in abroad.
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
      ) : results.length ? (
        <div className="space-y-6">
          {results.map((result) => (
            <article key={result._id} className="glass-card rounded-[2.25rem] p-6 md:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.25em] ${getResultStatusClasses(result.status)}`}>
                      {result.status}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                      Published {formatDisplayDate(result.publishedAt)}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-slate-800">
                    {result.hostCourseId.code} · {getCourseTitle(result.hostCourseId)}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">{result.hostCourseId.creditHours} credit hours</p>
                </div>

                <div className="rounded-[1.5rem] bg-slate-50 px-6 py-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Grade</p>
                  <p className="mt-2 text-3xl font-black text-slate-800">{result.grade}</p>
                  {result.marks != null ? <p className="mt-1 text-sm font-bold text-slate-500">{result.marks}/100</p> : null}
                </div>
              </div>

              {result.remarks ? (
                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-600">
                  {result.remarks}
                </div>
              ) : null}

              {result.resultFileUrl ? (
                <a
                  href={resolveUploadUrl(result.resultFileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-dark-blue transition hover:text-[#120d52]"
                >
                  <FileDown className="h-4 w-4" />
                  Download marksheet
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] px-6 py-12 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-4 text-2xl font-black text-slate-800">No results published yet</h2>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Your advisor will publish results here once your host courses have been graded.
          </p>
        </div>
      )}
    </div>
  );
}
