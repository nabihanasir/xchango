import { ArrowRight, Globe, FileCheck, CheckCircle2, TrendingUp, Sparkles, Zap, Award, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, colorClass, gradientClass, delay }: any) => (
  <div
    className={`bg-white rounded-2xl p-8 shadow-lg shadow-black/5 border border-light-color/50 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 animate-fade-in-up`}
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradientClass} opacity-10 rounded-bl-full transition-transform duration-500 group-hover:scale-110`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-body-text text-sm font-semibold mb-2 uppercase tracking-wider">{title}</p>
        <h3 className="text-5xl font-bold text-dark-blue">{value}</h3>
      </div>
      <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 transition-colors duration-300`}>
        <Icon className={`h-8 w-8 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
  </div>
);

const QuickAction = ({ title, description, icon: Icon, to, delay }: any) => (
  <Link
    to={to}
    className={`block bg-white p-8 rounded-2xl border border-light-color/50 shadow-sm hover:shadow-xl hover:shadow-black/5 hover:border-dark-blue/20 transition-all duration-300 group animate-fade-in-up`}
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
  >
    <div className="flex items-center gap-4 mb-5">
      <div className="p-4 bg-light-color/50 rounded-2xl group-hover:bg-dark-blue group-hover:text-white transition-colors duration-300 text-dark-blue">
        <Icon className="h-7 w-7" />
      </div>
      <h4 className="text-xl font-bold text-dark-blue group-hover:text-navy-hover transition-colors">{title}</h4>
    </div>
    <p className="text-body-text text-base mb-6 line-clamp-2 leading-relaxed">{description}</p>
    <div className="flex items-center text-accent-yellow font-bold text-base group-hover:text-yellow-default transition-colors">
      <span>Get Started</span>
      <ArrowRight className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" />
    </div>
  </Link>
);

export default function StudentDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-dark-blue rounded-3xl p-10 md:p-14 shadow-2xl shadow-dark-blue/20">
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-accent-yellow/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-accent-yellow text-sm font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="h-4 w-4" />
              <span>Welcome to your future</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-white leading-tight">
              Ready to start your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-yellow to-yellow-default">global journey?</span>
            </h2>
            <p className="text-white/80 text-xl max-w-xl leading-relaxed">
              Discover top universities, track your applications, and connect with advisors — all in one place.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link to="/dashboard/programmes" className="px-8 py-4 rounded-xl bg-accent-yellow hover:bg-yellow-default text-dark-blue font-bold text-lg shadow-lg shadow-accent-yellow/20 hover:shadow-accent-yellow/40 transition-all duration-300 hover:-translate-y-1 flex items-center gap-2">
                Explore Universities
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div className="hidden md:block relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-accent-yellow/20 to-transparent rounded-full blur-2xl" />
            <Globe className="h-56 w-56 text-white/10 animate-[spin_60s_linear_infinite]" strokeWidth={1} />
            <Award className="h-28 w-28 text-accent-yellow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_15px_rgba(251,210,19,0.5)]" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Available Programs" value="1,200+" icon={TrendingUp} colorClass="bg-blue-500 text-blue-500" gradientClass="from-blue-500 to-cyan-400" delay={100} />
        <StatCard title="Active Applications" value="2" icon={FileCheck} colorClass="bg-accent-yellow text-accent-yellow" gradientClass="from-accent-yellow to-yellow-default" delay={200} />
        <StatCard title="Accepted Offers" value="1" icon={CheckCircle2} colorClass="bg-green-500 text-green-500" gradientClass="from-green-500 to-emerald-400" delay={300} />
        <StatCard title="New Messages" value="3" icon={Zap} colorClass="bg-purple-500 text-purple-500" gradientClass="from-purple-500 to-pink-400" delay={400} />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-2xl font-bold text-dark-blue mb-6 flex items-center gap-3">
          <span className="w-1.5 h-7 bg-accent-yellow rounded-full inline-block" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickAction title="Browse Programs" description="Search through hundreds of programs across South Korea, Malaysia, and Turkiye." icon={Globe} to="/dashboard/programmes" delay={500} />
          <QuickAction title="Track Application" description="View the real-time status of your submitted university applications." icon={FileCheck} to="/dashboard/applications" delay={600} />
          <QuickAction title="Contact Advisor" description="Have questions? Send a direct message to your assigned student advisor." icon={MessageSquare} to="/dashboard/communicate" delay={700} />
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
