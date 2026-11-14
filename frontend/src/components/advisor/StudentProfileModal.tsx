import { AlertTriangle, BookOpen, Eye, Globe, GraduationCap, Hash, Mail, Phone, X } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import Modal from '../Modal';
import { resolveUploadUrl } from '../../lib/studentProfileApi';
import type { StudentProfile } from '../../types/studentProfile';

interface StudentProfileModalProps {
  student: StudentProfile;
  onClose: () => void;
}

const getInitials = (name?: string) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

const getCgpaTone = (cgpa?: number) =>
  cgpa === undefined ? 'text-slate-400' : cgpa >= 3.5 ? 'text-emerald-600' : cgpa >= 2.5 ? 'text-slate-900' : 'text-amber-600';

/** Colour a grade by its letter so weak grades stand out when scanning a semester. */
const getGradeClasses = (grade: string) => {
  const letter = grade.trim().charAt(0).toUpperCase();
  if (letter === 'A') return 'bg-emerald-100 text-emerald-700';
  if (letter === 'B') return 'bg-sky-100 text-sky-700';
  if (letter === 'C') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

const StatTile = ({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) => (
  <div className="rounded-2xl bg-slate-50 px-4 py-3.5">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
  </div>
);

const InfoRow = ({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) => (
  <div className="flex min-w-0 items-center gap-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
      <Icon className="h-[18px] w-[18px]" />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="truncate text-base font-semibold text-slate-900">{value}</p>
    </div>
  </div>
);

const Section = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
      <h4 className="text-lg font-bold text-slate-900">{title}</h4>
      {action}
    </div>
    {children}
  </section>
);

/** A student's full profile from My Students: contact details, preferences and the parsed transcript. */
export default function StudentProfileModal({ student, onClose }: StudentProfileModalProps) {
  const info = student.basicInfo;
  const transcript = student.transcript;
  const semesters = transcript?.semesters ?? [];
  const cgpa = student.cgpa || transcript?.cgpa || undefined;
  const countries = student.preferences?.preferredCountries ?? [];
  const subtitle = [info?.department, student.program].filter(Boolean).join(' · ') || 'Department not set';

  return (
    <Modal onClose={onClose} widthClass="max-w-4xl" labelledBy="student-profile-title">
      <div className="relative shrink-0 bg-gradient-to-r from-teal-800 to-teal-600 px-6 py-6 text-white md:px-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close student profile"
          className="absolute right-4 top-4 rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-5 pr-10">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold ring-1 ring-white/30">
            {getInitials(info?.fullName)}
          </span>
          <div className="min-w-0">
            <h3 id="student-profile-title" className="truncate text-2xl font-bold md:text-3xl">
              {info?.fullName || 'Unnamed Student'}
            </h3>
            <p className="mt-1 truncate text-base font-medium text-white/85">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6 md:px-8">
        {student.isProfileComplete === false ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base font-medium text-amber-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Profile incomplete{student.profileCompletionIssues?.length ? `: missing ${student.profileCompletionIssues.join(', ')}` : '.'}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="CGPA" value={cgpa ? cgpa.toFixed(2) : 'N/A'} tone={getCgpaTone(cgpa)} />
          <StatTile label="Semester" value={String(info?.semester || 'N/A')} />
          <StatTile label="Total credits" value={transcript?.totalCredits ? String(transcript.totalCredits) : 'N/A'} />
          <StatTile label="Semesters passed" value={String(semesters.length)} />
        </div>

        <Section title="Contact and identity">
          <div className="grid gap-5 sm:grid-cols-2">
            <InfoRow icon={Mail} label="Email" value={info?.email || 'Not provided'} />
            <InfoRow icon={Phone} label="Phone" value={info?.phone || 'Not provided'} />
            <InfoRow icon={Hash} label="Registration number" value={student.registrationNumber || 'Not provided'} />
            <InfoRow icon={Hash} label="CMS ID" value={info?.cmsId || 'Not provided'} />
          </div>
        </Section>

        <Section title="Exchange preferences">
          <div className="grid gap-5 sm:grid-cols-2">
            <InfoRow icon={BookOpen} label="Field of interest" value={student.preferences?.fieldOfInterest || 'Not provided'} />
            <InfoRow icon={GraduationCap} label="Degree level and intake" value={[student.preferences?.degreeLevel, student.preferences?.intake].filter(Boolean).join(' · ') || 'Not provided'} />
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Globe className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Preferred countries</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {countries.length ? (
                  countries.map((country) => (
                    <span key={country} className="rounded-full border border-teal-700/15 bg-teal-700/5 px-3.5 py-1 text-base font-semibold text-teal-700">
                      {country}
                    </span>
                  ))
                ) : (
                  <span className="text-base italic text-slate-500">None specified</span>
                )}
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Transcript"
          action={
            transcript?.fileUrl ? (
              <a
                href={resolveUploadUrl(transcript.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-base font-bold text-teal-700 transition hover:text-teal-900"
              >
                <Eye className="h-4 w-4" />
                Open original file
              </a>
            ) : null
          }
        >
          {semesters.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {semesters.map((semester) => (
                <div key={semester.semester} className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between bg-teal-50 px-4 py-3">
                    <p className="text-base font-bold text-slate-900">Semester {semester.semester}</p>
                    <p className="text-sm font-bold text-teal-700">SGPA {semester.sgpa.toFixed(2)}</p>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {semester.courses.map((course, index) => (
                      <li key={`${course.courseName}-${index}`} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{course.courseName}</span>
                        <span className="shrink-0 text-sm text-slate-500">{course.creditHours} cr</span>
                        <span className={`w-10 shrink-0 rounded-full py-0.5 text-center text-sm font-bold ${getGradeClasses(course.grade)}`}>{course.grade}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-8 text-center text-base text-slate-500">
              No parsed transcript yet. The student has not uploaded one, or it could not be read.
            </p>
          )}
        </Section>
      </div>
    </Modal>
  );
}
