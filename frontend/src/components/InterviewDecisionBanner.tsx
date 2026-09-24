import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import {
  isAwaitingAdvisorDecision,
  isNotRecommended,
  type WorkflowApplication,
} from '../types/application';

export default function InterviewDecisionBanner({
  application,
}: {
  application: Pick<WorkflowApplication, 'status' | 'interviewDecision'>;
}) {
  const decision = application.interviewDecision;

  if (isNotRecommended(application)) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-800">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="text-sm">
          <p className="font-black">Not recommended - this application cannot proceed.</p>
          {decision?.notes ? <p className="mt-1 font-medium">Advisor's reason: {decision.notes}</p> : null}
        </div>
      </div>
    );
  }

  if (decision?.recommended) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="text-sm">
          <p className="font-black">Recommended - you can continue with your application.</p>
          {decision.notes ? <p className="mt-1 font-medium">Advisor's note: {decision.notes}</p> : null}
        </div>
      </div>
    );
  }

  if (isAwaitingAdvisorDecision(application)) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-800">
        <Clock className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm font-black">
          Interview completed - your advisor has not yet recorded a recommendation.
        </p>
      </div>
    );
  }

  return null;
}
