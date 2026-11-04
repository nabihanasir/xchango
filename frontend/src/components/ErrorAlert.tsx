import { LifeBuoy } from 'lucide-react';
import { formatErrorSummary } from '../lib/errorUtils';
import Notice from './Notice';

interface ErrorAlertProps {
  error: unknown;
  titleOverride?: string;
}

/** Shows an API/app error in the standard popup (see Notice). */
export default function ErrorAlert({ error, titleOverride }: ErrorAlertProps) {
  const summary = formatErrorSummary(error);

  return (
    <Notice tone="error" title={titleOverride || summary.title} resetKey={error}>
      <p>
        <span className="font-bold">Reason:</span> {summary.reason}
      </p>
      <p className="mt-1">
        <span className="font-bold">Solution:</span> {summary.solution}
      </p>
      {summary.requestId ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          <LifeBuoy className="h-3.5 w-3.5" />
          Request ID: {summary.requestId}
        </p>
      ) : null}
    </Notice>
  );
}
