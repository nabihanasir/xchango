import { useEffect, useState } from 'react';
import { ChevronDown, GraduationCap, Sigma } from 'lucide-react';
import type { StudentTranscript } from '../../types/studentProfile';

interface TranscriptViewerProps {
  transcript: StudentTranscript | null;
}

const metricCardClassName = 'rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm';

export default function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const [openSemester, setOpenSemester] = useState<number | null>(null);

  useEffect(() => {
    setOpenSemester(transcript?.semesters[0]?.semester ?? null);
  }, [transcript]);

  if (!transcript || transcript.semesters.length === 0) {
    return (
      <section className="glass-card rounded-[2rem] p-7 md:p-8">
        <h2 className="text-2xl font-black text-slate-900">Transcript Viewer</h2>
        <p className="mt-3 text-sm text-slate-500">
          Upload a transcript to see semester-wise courses, SGPA, total credits, and CGPA.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-card rounded-[2rem] p-7 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-accent-yellow">Parsed Transcript</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Semester-Wise Academic Record</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className={metricCardClassName}>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">CGPA</p>
          <p className="mt-3 text-4xl font-black text-dark-blue">{transcript.cgpa.toFixed(2)}</p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Total Credits</p>
          <p className="mt-3 text-4xl font-black text-slate-900">{transcript.totalCredits}</p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Semesters Parsed</p>
          <p className="mt-3 text-4xl font-black text-slate-900">{transcript.semesters.length}</p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {transcript.semesters.map((semester) => {
          const isOpen = openSemester === semester.semester;

          return (
            <div key={semester.semester} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-slate-50"
                onClick={() => setOpenSemester(isOpen ? null : semester.semester)}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-dark-blue p-3 text-white">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900">Semester {semester.semester}</p>
                    <p className="mt-1 text-sm text-slate-500">{semester.courses.length} course(s) parsed</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-accent-yellow/20 px-4 py-2 text-sm font-black text-dark-blue">
                    <span className="mr-2 inline-flex align-middle">
                      <Sigma className="h-4 w-4" />
                    </span>
                    SGPA {semester.sgpa.toFixed(2)}
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {isOpen ? (
                <div className="border-t border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                            Course
                          </th>
                          <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                            Grade
                          </th>
                          <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                            Credit Hours
                          </th>
                          <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                            Grade Points
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {semester.courses.map((course) => (
                          <tr key={`${semester.semester}-${course.courseName}`} className="border-t border-slate-100">
                            <td className="px-5 py-4 text-sm font-semibold text-slate-900">{course.courseName}</td>
                            <td className="px-5 py-4 text-sm text-slate-600">{course.grade}</td>
                            <td className="px-5 py-4 text-sm text-slate-600">{course.creditHours}</td>
                            <td className="px-5 py-4 text-sm text-slate-600">{course.gradePoints.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
