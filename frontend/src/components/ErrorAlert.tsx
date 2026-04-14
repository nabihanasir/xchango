import { AlertTriangle, LifeBuoy } from 'lucide-react';
import { formatErrorSummary } from '../lib/errorUtils';

interface ErrorAlertProps {
  error: unknown;
  titleOverride?: string;
}

export default function ErrorAlert({ error, titleOverride }: ErrorAlertProps) {
  const summary = formatErrorSummary(error);

  return (
    <div className="rounded-[1.75rem] border border-red-200 bg-red-50/90 p-5 text-red-900 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-black">{titleOverride || summary.title}</p>
          <p className="mt-2 text-sm leading-6">
            <span className="font-bold">Reason:</span> {summary.reason}
          </p>
          <p className="mt-1 text-sm leading-6">
            <span className="font-bold">Solution:</span> {summary.solution}
          </p>
          {summary.requestId ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700">
              <LifeBuoy className="h-3.5 w-3.5" />
              Request ID: {summary.requestId}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
