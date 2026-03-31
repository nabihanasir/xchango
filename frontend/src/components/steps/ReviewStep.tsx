import type { ApplicationDraftPayload } from '../../types/application';

interface ReviewStepProps {
  draft: ApplicationDraftPayload;
}

const reviewRowClassName = 'flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between';

export default function ReviewStep({ draft }: ReviewStepProps) {
  return (
    <div className="space-y-3">
      <div className={reviewRowClassName}>
        <span className="text-sm font-bold text-slate-500">Country</span>
        <span className="text-sm font-semibold text-slate-900">{draft.country || 'Not selected'}</span>
      </div>
      <div className={reviewRowClassName}>
        <span className="text-sm font-bold text-slate-500">University</span>
        <span className="text-sm font-semibold text-slate-900">{draft.university || 'Not selected'}</span>
      </div>
      <div className={reviewRowClassName}>
        <span className="text-sm font-bold text-slate-500">Program</span>
        <span className="text-sm font-semibold text-slate-900">{draft.program || 'Not selected'}</span>
      </div>
      <div className={reviewRowClassName}>
        <span className="text-sm font-bold text-slate-500">Travel History</span>
        <span className="text-sm font-semibold text-slate-900">
          {draft.travelHistory.hasTravelHistory ? draft.travelHistory.details || 'Yes' : 'No'}
        </span>
      </div>
      <div className={reviewRowClassName}>
        <span className="text-sm font-bold text-slate-500">Passport Valid</span>
        <span className="text-sm font-semibold text-slate-900">{draft.passportValid ? 'Yes' : 'No'}</span>
      </div>
      <div className={reviewRowClassName}>
        <span className="text-sm font-bold text-slate-500">Financial Eligibility</span>
        <span className="text-sm font-semibold text-slate-900">{draft.financialEligible ? 'Yes' : 'Flag for review'}</span>
      </div>
      <div className={reviewRowClassName}>
        <span className="text-sm font-bold text-slate-500">Medical Condition</span>
        <span className="text-sm font-semibold text-slate-900">
          {draft.medicalCondition.hasCondition ? draft.medicalCondition.details || 'Declared' : 'No'}
        </span>
      </div>
      <div className={reviewRowClassName}>
        <span className="text-sm font-bold text-slate-500">Registration Number</span>
        <span className="text-sm font-semibold text-slate-900">{draft.registrationNumber || 'Not entered'}</span>
      </div>
      <div className={reviewRowClassName}>
        <span className="text-sm font-bold text-slate-500">Accommodation Preference</span>
        <span className="text-sm font-semibold text-slate-900">{draft.accommodationPreference}</span>
      </div>
    </div>
  );
}
