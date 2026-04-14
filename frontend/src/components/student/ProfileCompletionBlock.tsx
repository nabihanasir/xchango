import { ArrowRightCircle, FileCheck2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProfileCompletionBlock({
  title,
  message,
  actionLabel,
  actionTo,
  issues = [],
}: {
  title: string;
  message: string;
  actionLabel: string;
  actionTo: string;
  issues?: string[];
}) {
  return (
    <section className="rounded-[2.5rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-8 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full bg-amber-100 p-3 text-amber-700">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-3xl font-black text-slate-900">{title}</h1>
          <p className="mt-3 text-base font-medium leading-7 text-slate-600">{message}</p>
          {issues.length ? (
            <p className="mt-3 text-sm font-semibold text-amber-700">
              Missing: {issues.join(', ')}
            </p>
          ) : null}
        </div>

        <Link
          to={actionTo}
          className="inline-flex items-center gap-2 rounded-2xl bg-dark-blue px-5 py-4 text-sm font-black text-white"
        >
          {actionLabel}
          <ArrowRightCircle className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
