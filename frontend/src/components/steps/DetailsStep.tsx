import type { ReactNode } from 'react';
import type { ApplicationDraftPayload } from '../../types/application';

interface DetailsStepProps {
  draft: ApplicationDraftPayload;
  onChange: (updates: Partial<ApplicationDraftPayload>) => void;
}

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10';

const labelClassName = 'text-xs font-bold uppercase tracking-[0.25em] text-slate-600';

// Collapses to nothing (animated) until `open`, so a long form stays compact.
function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={`grid transition-all duration-300 ease-out ${
        open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

interface ToggleQuestionProps {
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  details: string;
  onDetails: (value: string) => void;
  placeholder: string;
}

function ToggleQuestion({ label, checked, onToggle, details, onDetails, placeholder }: ToggleQuestionProps) {
  return (
    <div>
      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4 accent-dark-blue"
          checked={checked}
          onChange={(event) => onToggle(event.target.checked)}
        />
        {label}
      </label>
      <Reveal open={checked}>
        <textarea
          className={`${inputClassName} min-h-24 resize-none`}
          value={details}
          onChange={(event) => onDetails(event.target.value)}
          placeholder={placeholder}
          tabIndex={checked ? 0 : -1}
        />
      </Reveal>
    </div>
  );
}

export default function DetailsStep({ draft, onChange }: DetailsStepProps) {
  return (
    <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Application details</h3>
        <p className="mt-1 text-sm text-slate-500">Answer the questions below. Extra fields appear only when needed.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClassName}>Registration Number</span>
          <input
            className={inputClassName}
            value={draft.registrationNumber}
            onChange={(event) => onChange({ registrationNumber: event.target.value })}
            placeholder="49141"
          />
        </label>

        <label className="space-y-2">
          <span className={labelClassName}>Accommodation Preference</span>
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

      <div className="space-y-5 border-t border-slate-100 pt-5">
        <ToggleQuestion
          label="I have prior travel history"
          checked={draft.travelHistory.hasTravelHistory}
          onToggle={(hasTravelHistory) => onChange({ travelHistory: { ...draft.travelHistory, hasTravelHistory } })}
          details={draft.travelHistory.details || ''}
          onDetails={(details) => onChange({ travelHistory: { ...draft.travelHistory, details } })}
          placeholder="Provide travel details (countries, dates, purpose)"
        />

        <ToggleQuestion
          label="I have a medical condition to disclose"
          checked={draft.medicalCondition.hasCondition}
          onToggle={(hasCondition) => onChange({ medicalCondition: { ...draft.medicalCondition, hasCondition } })}
          details={draft.medicalCondition.details || ''}
          onDetails={(details) => onChange({ medicalCondition: { ...draft.medicalCondition, details } })}
          placeholder="Describe the medical condition"
        />
      </div>

      <div className="grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-dark-blue"
            checked={draft.financialEligible}
            onChange={(event) => onChange({ financialEligible: event.target.checked })}
          />
          Financially eligible
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-dark-blue"
            checked={draft.consentExtension}
            onChange={(event) => onChange({ consentExtension: event.target.checked })}
          />
          Consent to extension
        </label>
      </div>
    </div>
  );
}
