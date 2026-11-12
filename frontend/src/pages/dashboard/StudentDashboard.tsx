import { ArrowRight, Globe, FileCheck, Building2, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import CountryHeroCarousel from '../../components/CountryHeroCarousel';
import StudentProgressTracker from '../../components/student/StudentProgressTracker';


const QuickAction = ({ title, description, icon: Icon, to, delay }: any) => (
  <Link
    to={to}
    className={`block glass-card rounded-[2rem] p-8 transition-all duration-300 group hover:-translate-y-1 animate-fade-in-up`}
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
  >
    <div className="flex items-center gap-4 mb-6">
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-[1.25rem] group-hover:bg-dark-blue-deep group-hover:border-dark-blue-deep group-hover:text-white transition-all duration-300 text-dark-blue shadow-sm">
        <Icon className="h-7 w-7" />
      </div>
      <h4 className="text-xl font-bold text-slate-800 group-hover:text-dark-blue transition-colors">{title}</h4>
    </div>
    <p className="text-slate-500 text-base font-medium mb-8 line-clamp-2 leading-relaxed">{description}</p>
    <div className="flex items-center text-accent-yellow font-bold text-sm uppercase tracking-widest group-hover:text-yellow-default transition-colors">
      <span>Get Started</span>
      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-2 transition-transform duration-300" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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


