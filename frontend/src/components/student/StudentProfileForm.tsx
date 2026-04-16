import { useEffect, useState } from 'react';
import { BookOpen, Globe2, Mail, Phone, UserRound } from 'lucide-react';
import type { StudentBasicInfo, StudentPreferences } from '../../types/studentProfile';

interface StudentProfileFormProps {
  basicInfo: StudentBasicInfo;
  preferences: StudentPreferences;
  saving: boolean;
  errorMessage?: string;
  onSubmit: (payload: { basicInfo: StudentBasicInfo; preferences: StudentPreferences }) => Promise<void>;
}

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10';

export default function StudentProfileForm({
  basicInfo,
  preferences,
  saving,
  errorMessage,
  onSubmit,
}: StudentProfileFormProps) {
  const [formState, setFormState] = useState({
    basicInfo,
    preferences: {
      ...preferences,
      preferredCountriesText: preferences.preferredCountries.join(', '),
    },
  });

  useEffect(() => {
    setFormState({
      basicInfo,
      preferences: {
        ...preferences,
        preferredCountriesText: preferences.preferredCountries.join(', '),
      },
    });
  }, [basicInfo, preferences]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      basicInfo: {
        ...formState.basicInfo,
        semester: Number(formState.basicInfo.semester) || 0,
      },
      preferences: {
        preferredCountries: formState.preferences.preferredCountriesText
          .split(',')
          .map((country) => country.trim())
          .filter(Boolean),
        degreeLevel: formState.preferences.degreeLevel,
        fieldOfInterest: formState.preferences.fieldOfInterest,
        intake: formState.preferences.intake,
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

      <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
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
              value={formState.basicInfo.semester}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  basicInfo: { ...current.basicInfo, semester: Number(event.target.value) || 0 },
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

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Intake</span>
              <input
                className={inputClassName}
                value={formState.preferences.intake}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    preferences: { ...current.preferences, intake: event.target.value },
                  }))
                }
                placeholder="Fall 2026"
              />
            </label>
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-dark-blue px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0e1550] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving profile...' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  );
}
