import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAdvisorTasks } from '../../hooks/useAdvisorTasks';
import { pickNextAdvisorTask } from '../../utils/advisorTasks';

/** Pages where a prompt would get in the way. */
const HIDDEN_ON = ['/advisor/communicate', '/advisor/profile'];

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
    <div className="sticky bottom-4 z-20 mt-8">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Your next step</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">
            {next.title} <span className="font-normal text-slate-600">— {next.description}</span>
          </p>
          {others > 0 ? (
            <p className="mt-0.5 text-xs text-slate-500">
              {others} more thing{others === 1 ? '' : 's'} waiting after this.
            </p>
          ) : null}
        </div>
        <Link
          to={next.to}
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0e1550]"
        >
          {next.actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
