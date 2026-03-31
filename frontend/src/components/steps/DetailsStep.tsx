import type { ApplicationDraftPayload } from '../../types/application';

interface DetailsStepProps {
  draft: ApplicationDraftPayload;
  onChange: (updates: Partial<ApplicationDraftPayload>) => void;
}

const inputClassName =
  'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10';

export default function DetailsStep({ draft, onChange }: DetailsStepProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black text-slate-900">Section A: Travel</h3>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.travelHistory.hasTravelHistory}
              onChange={(event) =>
                onChange({
                  travelHistory: {
                    ...draft.travelHistory,
                    hasTravelHistory: event.target.checked,
                  },
                })
              }
            />
            I have prior travel history
          </label>
          <textarea
            className={`${inputClassName} min-h-28 resize-none`}
            value={draft.travelHistory.details || ''}
            onChange={(event) =>
              onChange({
                travelHistory: {
                  ...draft.travelHistory,
                  details: event.target.value,
                },
              })
            }
            placeholder="Provide travel details if applicable"
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black text-slate-900">Section B: Eligibility</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.passportValid}
              onChange={(event) => onChange({ passportValid: event.target.checked })}
            />
            Passport valid
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.financialEligible}
              onChange={(event) => onChange({ financialEligible: event.target.checked })}
            />
            Financially eligible
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.consentExtension}
              onChange={(event) => onChange({ consentExtension: event.target.checked })}
            />
            Consent to extension
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black text-slate-900">Section C: Health</h3>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.medicalCondition.hasCondition}
              onChange={(event) =>
                onChange({
                  medicalCondition: {
                    ...draft.medicalCondition,
                    hasCondition: event.target.checked,
                  },
                })
              }
            />
            I have a medical condition to disclose
          </label>
          <textarea
            className={`${inputClassName} min-h-28 resize-none`}
            value={draft.medicalCondition.details || ''}
            onChange={(event) =>
              onChange({
                medicalCondition: {
                  ...draft.medicalCondition,
                  details: event.target.value,
                },
              })
            }
            placeholder="Describe the medical condition if applicable"
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black text-slate-900">Section D: Logistics</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Registration Number
            </span>
            <input
              className={inputClassName}
              value={draft.registrationNumber}
              onChange={(event) => onChange({ registrationNumber: event.target.value })}
              placeholder="49141"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Accommodation Preference
            </span>
            <select
              className={inputClassName}
              value={draft.accommodationPreference}
              onChange={(event) =>
                onChange({ accommodationPreference: event.target.value as ApplicationDraftPayload['accommodationPreference'] })
              }
            >
              <option value="UNIVERSITY">University</option>
              <option value="SELF">Self</option>
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}
