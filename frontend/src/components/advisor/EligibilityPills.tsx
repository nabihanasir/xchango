import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import type { CheckStatus, EligibilityCheck } from '../../types/equivalency';

const PILL_STYLES: Record<CheckStatus, { icon: typeof CheckCircle2; className: string }> = {
  pass: { icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  warn: { icon: AlertTriangle, className: 'border-amber-200 bg-amber-50 text-amber-700' },
  fail: { icon: XCircle, className: 'border-red-200 bg-red-50 text-red-700' },
  unknown: { icon: HelpCircle, className: 'border-slate-200 bg-slate-50 text-slate-500' },
};

/** How many checks need attention (warnings and failures), for the summary on a collapsed course. */
export const countConcerns = (checks: EligibilityCheck[]) => ({
  failed: checks.filter((check) => check.status === 'fail').length,
  warned: checks.filter((check) => check.status === 'warn').length,
});

/** One small coloured pill per check, with the reason on hover. The full text is in the checklist below them. */
export default function EligibilityPills({ checks }: { checks: EligibilityCheck[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {checks.map((check, index) => {
        const { icon: Icon, className } = PILL_STYLES[check.status];
        return (
          <li
            key={check.key}
            title={check.message}
            style={{ animationDelay: `${index * 60}ms` }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold motion-safe:animate-pop-in ${className}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {check.label}
          </li>
        );
      })}
    </ul>
  );
}
