import { ArrowRight, Globe, FileCheck, Building2, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import CountryHeroCarousel from '../../components/CountryHeroCarousel';
import StudentProgressTracker from '../../components/student/StudentProgressTracker';


const QuickAction = ({ title, description, icon: Icon, to, delay }: any) => (
  <Link
    to={to}
    className="glass-card group flex h-full flex-col rounded-[1.75rem] p-6 transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
  >
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-dark-blue shadow-sm transition-all duration-300 group-hover:border-dark-blue-deep group-hover:bg-dark-blue-deep group-hover:text-white">
      <Icon className="h-6 w-6" />
    </div>
    <h4 className="mb-2 text-lg font-bold text-slate-800 transition-colors group-hover:text-dark-blue">{title}</h4>
    <p className="mb-6 text-sm font-medium leading-relaxed text-slate-600">{description}</p>
    <div className="mt-auto flex items-center border-t border-slate-100 pt-4 text-sm font-bold text-dark-blue">
      <span>Get started</span>
      <ArrowRight className="ml-2 h-4 w-4 text-accent-yellow transition-transform duration-300 group-hover:translate-x-1.5" />
    </div>
  </Link>
);

export default function StudentDashboard() {
  return (
    <div className="space-y-10 animate-fade-in">
      <CountryHeroCarousel
        title={
          <>
            Ready to start your <span className="text-accent-yellow">global journey?</span>
          </>
        }
        description="Discover top universities, track your applications, and connect with advisors — all in one place."
        scrimClass="bg-student-side/60"
        minHeightClass="min-h-[200px]"
        showTicker={false}
      >
        <Link
          to="/dashboard/programmes"
          className="inline-flex items-center gap-3 rounded-[1.25rem] bg-accent-yellow px-8 py-4 text-base font-bold text-dark-blue transition-colors hover:bg-yellow-default"
        >
          Explore Universities
          <ArrowRight className="h-5 w-5" />
        </Link>
      </CountryHeroCarousel>

      <StudentProgressTracker />

      {/* Quick Actions */}
      <div>
        <h3 className="text-2xl font-bold text-dark-blue mb-6 flex items-center gap-3">
          <span className="w-1.5 h-7 bg-accent-yellow rounded-full inline-block" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction title="Browse Programs" description="Search through hundreds of programs across South Korea, Malaysia, and Turkiye." icon={Globe} to="/dashboard/programmes" delay={500} />
          <QuickAction title="Track Application" description="View the real-time status of your submitted university applications." icon={FileCheck} to="/dashboard/applications" delay={600} />
          <QuickAction title="International Office" description="Learn how the Riphah International Office supports your exchange journey." icon={Building2} to="/dashboard/international-office" delay={700} />
          <QuickAction title="Join Online Class" description="Open your free Jitsi classroom and copy meeting details for upcoming lectures." icon={Video} to="/dashboard/online-classes" delay={800} />
        </div>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
}


