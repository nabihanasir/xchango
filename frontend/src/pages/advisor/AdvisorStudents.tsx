import { useEffect, useState } from 'react';
import { Mail, Phone, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { advisorApi, type AdvisorProfileData } from '../../lib/advisorApi';
import type { StudentProfile } from '../../types/studentProfile';

export default function AdvisorStudents() {
  const { user } = useAuth();
  const [, setProfile] = useState<AdvisorProfileData | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
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
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#081028] via-[#102b52] to-[#19648b] p-8 text-white shadow-2xl shadow-sky-950/10 md:p-10">
        <div className="absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/3 rounded-full bg-cyan-300/15 blur-[80px]" />
        <div className="relative z-10 max-w-4xl">
          <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.35em] text-accent-yellow">
            My Students
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            Assigned Student Portfolios
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
            View details and progress for all students assigned to your advisory scope.
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 flex items-center gap-3 text-sm font-medium text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
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
            <h3 className="text-xl font-bold text-dark-blue mb-2">No Students Assigned</h3>
            <p>You have not been assigned any students yet. They will appear here once assigned by administrators.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <article
                key={student._id || student.userId}
                className="glass-card flex border border-light-color/40 flex-col overflow-hidden rounded-[2rem] transition-shadow hover:shadow-lg dark:hover:shadow-white/5"
              >
                <div className="border-b border-light-color/30 bg-slate-50/50 p-6">
                  <h3 className="text-xl font-bold text-dark-blue truncate">
                    {student.basicInfo?.fullName || 'Unnamed Student'}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-body-text truncate">
                    {student.basicInfo?.department || 'Department not set'}
                  </p>
                </div>
                
                <div className="flex-1 space-y-4 p-6">
                  <div className="flex items-center gap-3 text-sm text-body-text">
                    <Mail className="h-4 w-4 text-accent-yellow shrink-0" />
                    <span className="truncate">{student.basicInfo?.email || 'No email provided'}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-body-text">
                    <Phone className="h-4 w-4 text-accent-yellow shrink-0" />
                    <span className="truncate">{student.basicInfo?.phone || 'No phone provided'}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-body-text">
                    <BookOpen className="h-4 w-4 text-accent-yellow shrink-0" />
                    <span className="truncate">CGPA: {student.cgpa?.toFixed(2) || student.transcript?.cgpa?.toFixed(2) || 'N/A'}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-body-text">
                    <Clock className="h-4 w-4 text-accent-yellow shrink-0" />
                    <span className="truncate">Semester: {student.basicInfo?.semester || 'N/A'}</span>
                  </div>

                  <div className="mt-6 pt-4 border-t border-light-color/30">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {student.preferences?.preferredCountries?.slice(0, 3).map((country) => (
                        <span key={country} className="rounded-full bg-dark-blue/5 border border-dark-blue/10 px-3 py-1 text-xs font-semibold text-dark-blue">
                          {country}
                        </span>
                      ))}
                      {(!student.preferences?.preferredCountries || student.preferences.preferredCountries.length === 0) && (
                        <span className="text-xs text-slate-400 italic">None specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
