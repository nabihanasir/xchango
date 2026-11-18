import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useStudentJourney } from '../../hooks/useStudentJourney';
import { buildStudentJourney } from '../../utils/studentJourney';

/** Pages where a "next step" prompt would get in the way (the dashboard already shows the tracker). */
const HIDDEN_ON = ['/dashboard', '/dashboard/applications/new', '/dashboard/communicate'];

const trimPath = (path: string) => path.replace(/\/+$/, '') || '/';

/**
 * Bar shown under the page header on student screens that links to the student's next step in the application
 * journey. It sits in the page flow, so it never covers content, and it stays out of the way on the page that
 * step already lives on.
 */
export default function NextStepBar() {
  const { pathname } = useLocation();
  const [journey] = useStudentJourney(pathname);

  const here = trimPath(pathname);
  if (!journey || HIDDEN_ON.includes(here)) {
    return null;
  }

  const step = buildStudentJourney(journey).find((item) => item.state === 'current' || item.state === 'stopped');
  if (!step || !step.actionLabel) {
    return null;
  }

  // "I have arrived" is reported on the Arrival page.
  const reportsArrival = step.actionKind === 'report-arrival';
  const target = reportsArrival ? '/dashboard/arrival' : step.to;
  if (trimPath(target) === here) {
    return null;
  }

  const stopped = step.state === 'stopped';

  return (
    <div className="mb-6">
      <div
        className={`flex flex-col gap-3 rounded-2xl border py-2 pl-4 pr-2 shadow-sm md:flex-row md:items-center md:justify-between ${
          stopped ? 'border-red-200 bg-red-50/95' : 'border-slate-200 bg-white/95'
        }`}
      >
        <p className="min-w-0 text-sm md:truncate">
          <span className="mr-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            {stopped ? 'Needs attention' : 'Next step'}
          </span>
          <span className="font-bold text-slate-900">{step.title}</span>
          <span className="font-normal text-slate-600"> — {step.description}</span>
        </p>
        <Link
          to={target}
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-dark-blue px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0e1550]"
        >
          {step.actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
