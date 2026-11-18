import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAdvisorTasks } from '../../hooks/useAdvisorTasks';
import { pickNextAdvisorTask } from '../../utils/advisorTasks';

/** Pages where a prompt would get in the way. The dashboard already lists every task. */
const HIDDEN_ON = ['/advisor', '/advisor/communicate', '/advisor/profile'];

/**
 * Sticky bar on advisor screens that links to the most urgent thing waiting for the advisor. It skips tasks that
 * belong to the page the advisor is already on, and stays hidden when nothing is waiting.
 */
export default function AdvisorNextStepBar() {
  const { pathname } = useLocation();
  const tasks = useAdvisorTasks(pathname);

  if (!tasks || HIDDEN_ON.includes(pathname.replace(/\/+$/, ''))) {
    return null;
  }

  const { next, others } = pickNextAdvisorTask(tasks, pathname);
  if (!next) {
    return null;
  }

  return (
    <div className="sticky bottom-2 z-20 mt-4 md:pr-20">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 py-2 pl-4 pr-2 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
        <p className="min-w-0 text-sm md:truncate">
          <span className="mr-2 text-xs font-bold uppercase tracking-widest text-slate-500">Next step</span>
          <span className="font-bold text-slate-900">{next.title}</span>
          <span className="font-normal text-slate-600"> — {next.description}</span>
          {others > 0 ? (
            <span className="ml-2 text-xs text-slate-500">
              (+{others} more)
            </span>
          ) : null}
        </p>
        <Link
          to={next.to}
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-dark-blue px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0e1550]"
        >
          {next.actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
