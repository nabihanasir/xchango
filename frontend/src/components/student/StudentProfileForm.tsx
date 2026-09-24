import { useEffect, useState } from 'react';
import { BookOpen, Globe2, Mail, Phone, UserRound } from 'lucide-react';
import type { StudentBasicInfo, StudentPreferences } from '../../types/studentProfile';

// The submit button lives at the bottom of the page (after the transcript) and targets this form by id.
export const STUDENT_PROFILE_FORM_ID = 'student-profile-form';

const MAX_SEMESTER = 8;

const clampSemester = (value: number | string) => Math.min(MAX_SEMESTER, Math.max(0, Math.floor(Number(value)) || 0));

const INTAKE_SEASONS = ['Spring', 'Fall'];
const MIN_INTAKE_YEAR = 2023;

const defaultIntakeYear = () => Math.max(MIN_INTAKE_YEAR, new Date().getFullYear());

// The intake is stored as one string ("Fall 2026") but edited as a season plus a year.
const parseIntake = (intake: string) => {
  const match = intake.trim().match(/^(spring|fall)\s+(\d{4})$/i);
  if (!match) {
    return { intakeSeason: '', intakeYear: '' };
  }
  const season = INTAKE_SEASONS.find((option) => option.toLowerCase() === match[1].toLowerCase()) ?? '';
  return { intakeSeason: season, intakeYear: match[2] };
};

const buildIntake = (season: string, year: string) => {
  const numericYear = Math.floor(Number(year));
  if (!season || !numericYear) {
    return '';
  }
  return `${season} ${Math.max(MIN_INTAKE_YEAR, numericYear)}`;
};

const buildFormState = (basicInfo: StudentBasicInfo, preferences: StudentPreferences) => ({
  basicInfo,
  preferences: {
    ...preferences,
    preferredCountriesText: preferences.preferredCountries.join(', '),
    ...parseIntake(preferences.intake),
  },
});

interface StudentProfileFormProps {
  basicInfo: StudentBasicInfo;
  preferences: StudentPreferences;
  onSubmit: (payload: { basicInfo: StudentBasicInfo; preferences: StudentPreferences }) => Promise<void>;
}

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10';

export default function StudentProfileForm({ basicInfo, preferences, onSubmit }: StudentProfileFormProps) {
  const [formState, setFormState] = useState(() => buildFormState(basicInfo, preferences));

  useEffect(() => {
    setFormState(buildFormState(basicInfo, preferences));
  }, [basicInfo, preferences]);

  const intakeIncomplete =
    Boolean(formState.preferences.intakeSeason) !== Boolean(formState.preferences.intakeYear);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      basicInfo: {
        ...formState.basicInfo,
        semester: clampSemester(formState.basicInfo.semester),
      },
      preferences: {
        preferredCountries: formState.preferences.preferredCountriesText
          .split(',')
          .map((country) => country.trim())
          .filter(Boolean),
        degreeLevel: formState.preferences.degreeLevel,
        fieldOfInterest: formState.preferences.fieldOfInterest,
        intake: buildIntake(formState.preferences.intakeSeason, formState.preferences.intakeYear),
      },
    });
  };

  return (
    <section className="glass-card rounded-[2rem] p-7 md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-accent-yellow">Student Profile</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Basic Info and Preferences</h2>
          <p className="mt-2 text-sm text-slate-500">
            Keep your profile current so transcript review and outbound placement stay aligned.
          </p>
        </div>
      </div>

      <form id={STUDENT_PROFILE_FORM_ID} className="mt-8 space-y-8" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              <UserRound className="h-4 w-4" />
              Full Name
            </span>
            <input
              className={inputClassName}
              value={formState.basicInfo.fullName}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  basicInfo: { ...current.basicInfo, fullName: event.target.value },
                }))
              }
              placeholder="Student full name"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">CMS ID</span>
            <input
              className={inputClassName}
              value={formState.basicInfo.cmsId}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  basicInfo: { ...current.basicInfo, cmsId: event.target.value },
                }))
              }
              placeholder="CMS / SAP ID"
            />
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              <Mail className="h-4 w-4" />
              Email
            </span>
            <input
              className={inputClassName}
              type="email"
              value={formState.basicInfo.email}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  basicInfo: { ...current.basicInfo, email: event.target.value },
                }))
              }
              placeholder="student@riphah.edu.pk"
            />
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              <Phone className="h-4 w-4" />
              Phone
            </span>
            <input
              className={inputClassName}
              value={formState.basicInfo.phone}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  basicInfo: { ...current.basicInfo, phone: event.target.value },
                }))
              }
              placeholder="+92..."
            />
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              <BookOpen className="h-4 w-4" />
              Department
            </span>
            <input
              className={inputClassName}
              value={formState.basicInfo.department}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  basicInfo: { ...current.basicInfo, department: event.target.value },
                }))
              }
              placeholder="Department or program"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Semester</span>
            <input
              className={inputClassName}
              type="number"
              min={1}
              max={MAX_SEMESTER}
              value={formState.basicInfo.semester}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  basicInfo: { ...current.basicInfo, semester: clampSemester(event.target.value) },
                }))
              }
              placeholder="Current semester"
            />
          </label>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-dark-blue p-3 text-white">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Academic Preferences</h3>
              <p className="text-sm text-slate-500">Capture degree, field, intake, and preferred destination details.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                Preferred Countries
              </span>
              <input
                className={inputClassName}
                value={formState.preferences.preferredCountriesText}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    preferences: { ...current.preferences, preferredCountriesText: event.target.value },
                  }))
                }
                placeholder="Malaysia, Turkiye, South Korea"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Degree Level</span>
              <input
                className={inputClassName}
                value={formState.preferences.degreeLevel}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    preferences: { ...current.preferences, degreeLevel: event.target.value },
                  }))
                }
                placeholder="Undergraduate / Graduate"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                Field of Interest
              </span>
              <input
                className={inputClassName}
                value={formState.preferences.fieldOfInterest}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    preferences: { ...current.preferences, fieldOfInterest: event.target.value },
                  }))
                }
                placeholder="Artificial Intelligence"
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Intake</span>
              <div className="grid grid-cols-2 gap-3">
                <select
                  aria-label="Intake season"
                  className={inputClassName}
                  value={formState.preferences.intakeSeason}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      preferences: {
                        ...current.preferences,
                        intakeSeason: event.target.value,
                        // Picking a season with no year yet defaults the year so both halves are set.
                        intakeYear: current.preferences.intakeYear || String(defaultIntakeYear()),
                      },
                    }))
                  }
                >
                  <option value="">Season</option>
                  {INTAKE_SEASONS.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Intake year"
                  className={inputClassName}
                  type="number"
                  step={1}
                  min={MIN_INTAKE_YEAR}
                  value={formState.preferences.intakeYear}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      preferences: { ...current.preferences, intakeYear: event.target.value },
                    }))
                  }
                  placeholder="Year"
                />
              </div>
              {intakeIncomplete ? (
                <p className="text-xs font-semibold text-amber-600">
                  Select both a season and a year, otherwise the intake will not be saved.
                </p>
              ) : null}
            </div>
          </div>
        </div>

      </form>
    </section>
  );
}
