import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import type { CheckStatus, EligibilityCheck } from '../../types/equivalency';

const STATUS_STYLES: Record<CheckStatus, { icon: typeof CheckCircle2; className: string }> = {
  pass: { icon: CheckCircle2, className: 'text-emerald-600' },
  warn: { icon: AlertTriangle, className: 'text-amber-600' },
  fail: { icon: XCircle, className: 'text-red-600' },
  unknown: { icon: HelpCircle, className: 'text-slate-400' },
};

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  pass: 'Passed',
  warn: 'Check',
  fail: 'Failed',
  unknown: 'Not checked',
};

interface EligibilityChecklistProps {
  checks: EligibilityCheck[];
}

/** One line per eligibility check, with an icon for the outcome and the reason in words. */
export default function EligibilityChecklist({ checks }: EligibilityChecklistProps) {
  return (
    <ul className="space-y-2">
      {checks.map((check) => {
        const { icon: Icon, className } = STATUS_STYLES[check.status];
        return (
          <li key={check.key} className="flex items-start gap-2 text-xs font-medium leading-5 text-slate-600">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} aria-label={CHECK_STATUS_LABELS[check.status]} />
            <span>
              <span className="font-bold text-slate-700">{check.label}:</span> {check.message}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
