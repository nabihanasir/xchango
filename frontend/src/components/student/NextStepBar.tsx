import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useStudentJourney } from '../../hooks/useStudentJourney';
import { buildStudentJourney } from '../../utils/studentJourney';

/** Pages where a "next step" prompt would get in the way (the dashboard already shows the tracker). */
const HIDDEN_ON = ['/dashboard', '/dashboard/applications/new', '/dashboard/communicate'];

const trimPath = (path: string) => path.replace(/\/+$/, '') || '/';

/**
 * Sticky bar shown on student screens that links to the student's next step in the application journey.
 * It stays out of the way on the page that step already lives on.
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

  // "I have arrived" is a button on the dashboard tracker, so send the student there.
  const reportsArrival = step.actionKind === 'report-arrival';
  const target = reportsArrival ? '/dashboard' : step.to;
  if (trimPath(target) === here) {
    return null;
  }

  const stopped = step.state === 'stopped';

  return (
    <div className="sticky bottom-4 z-20 mt-8">
      <div
        className={`flex flex-col gap-3 rounded-[1.5rem] border p-4 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between ${
          stopped ? 'border-red-200 bg-red-50/95' : 'border-slate-200 bg-white/95'
        }`}
      >
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {stopped ? 'Needs attention' : 'Your next step'}
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">
            {step.title} <span className="font-normal text-slate-600">— {step.description}</span>
          </p>
        </div>
        <Link
          to={target}
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-2xl bg-dark-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0e1550]"
        >
          {reportsArrival ? 'Go to your progress' : step.actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
