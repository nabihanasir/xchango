import { useEffect, useState } from 'react';
import { ArrowRight, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { advisorApi, type AdvisorProfileData } from '../../lib/advisorApi';
import type { StudentProfile } from '../../types/studentProfile';
import Notice from '../../components/Notice';
import StudentProfileModal from '../../components/advisor/StudentProfileModal';
import Pagination, { usePagination } from '../../components/Pagination';

const getInitials = (name?: string) =>
  (name || '?')
    .split(/s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

const getCgpa = (student: StudentProfile) => student.cgpa || student.transcript?.cgpa || undefined;

/** Colour the CGPA so strong and weak records stand out at a glance. */
const getCgpaTone = (cgpa?: number) => (cgpa === undefined ? 'text-slate-400' : cgpa >= 3.5 ? 'text-emerald-600' : cgpa >= 2.5 ? 'text-slate-800' : 'text-amber-600');

export default function AdvisorStudents() {
  const { user } = useAuth();
  const [, setProfile] = useState<AdvisorProfileData | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const studentPaging = usePagination(students, 9);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const advisorProfile = await advisorApi.getProfile();
        if (cancelled) return;

        setProfile(advisorProfile);
        const profiles = await advisorApi.getStudents();
        if (cancelled) return;
        setStudents(profiles);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load assigned students.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [user?.token]);

  return (
    <div className="space-y-8 animate-fade-in">
      {error ? (
        <Notice tone="error">{error}</Notice>
      ) : null}

      <div className="space-y-6">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card h-64 rounded-[2rem] animate-pulse" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="glass-card rounded-[2rem] px-6 py-16 text-center text-slate-500">
            <h3 className="text-xl font-bold text-teal-700 mb-2">No Students Assigned</h3>
            <p>You have not been assigned any students yet. They will appear here once assigned by administrators.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {studentPaging.pageItems.map((student) => (
              <article
                key={student._id || student.userId}
                role="button"
                tabIndex={0}
                aria-label={`Open profile of ${student.basicInfo?.fullName || 'student'}`}
                onClick={() => setSelectedStudent(student)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedStudent(student);
                  }
                }}
                className="group glass-card flex cursor-pointer flex-col overflow-hidden rounded-[2rem] border border-light-color/40 transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="flex items-start gap-4 p-6 pb-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 to-teal-500 text-lg font-bold text-white shadow-md shadow-teal-700/20">
                    {getInitials(student.basicInfo?.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl font-bold text-slate-900">{student.basicInfo?.fullName || 'Unnamed Student'}</h3>
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                      {student.basicInfo?.department || 'Department not set'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700">Semester {student.basicInfo?.semester || 'N/A'}</span>
                      {student.isProfileComplete === false ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Profile incomplete</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 px-6">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">CGPA</p>
                    <p className={`mt-0.5 text-2xl font-bold ${getCgpaTone(getCgpa(student))}`}>{getCgpa(student)?.toFixed(2) ?? 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Credits</p>
                    <p className="mt-0.5 text-2xl font-bold text-slate-800">{student.transcript?.totalCredits ?? 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-2.5 px-6 pt-4 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 shrink-0 text-accent-yellow" />
                    <span className="truncate">{student.basicInfo?.email || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 shrink-0 text-accent-yellow" />
                    <span className="truncate">{student.basicInfo?.phone || 'No phone provided'}</span>
                  </div>
                </div>

                <div className="mt-4 flex-1 px-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Interested in</p>
                  <div className="flex flex-wrap gap-2">
                    {student.preferences?.preferredCountries?.slice(0, 3).map((country) => (
                      <span key={country} className="rounded-full border border-teal-700/15 bg-teal-700/5 px-3 py-1 text-sm font-semibold text-teal-700">
                        {country}
                      </span>
                    ))}
                    {(student.preferences?.preferredCountries?.length ?? 0) > 3 ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500">
                        +{(student.preferences?.preferredCountries?.length ?? 0) - 3}
                      </span>
                    ) : null}
                    {!student.preferences?.preferredCountries?.length ? <span className="text-sm italic text-slate-500">None specified</span> : null}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-light-color/30 px-6 py-3.5 text-sm font-bold text-teal-700">
                  <span>View profile</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination
          page={studentPaging.page}
          totalPages={studentPaging.totalPages}
          total={studentPaging.total}
          pageSize={studentPaging.pageSize}
          onPageChange={studentPaging.setPage}
        />
      </div>

      {selectedStudent ? <StudentProfileModal student={selectedStudent} onClose={() => setSelectedStudent(null)} /> : null}
    </div>
  );
}
