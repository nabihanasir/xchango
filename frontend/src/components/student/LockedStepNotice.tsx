import { ArrowRight, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

/** The card shown in place of a page that is not open yet. Every locked page uses this one design. */
export default function LockedStepNotice({
  title,
  message,
  actionLabel,
  actionTo,
  issues = [],
}: {
  title: string;
  message: string;
  actionLabel?: string;
  actionTo?: string;
  issues?: string[];
}) {
  return (
    <div className="glass-card flex items-start gap-4 rounded-[2rem] p-6 md:p-8">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Lock className="h-5 w-5" />
      </span>
      <div className="space-y-3">
        <p className="text-lg font-bold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{message}</p>
        {issues.length ? <p className="text-sm font-semibold text-amber-700">Missing: {issues.join(', ')}</p> : null}
        {actionLabel && actionTo ? (
          <Link to={actionTo} className="inline-flex items-center gap-2 text-sm font-bold text-dark-blue">
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
