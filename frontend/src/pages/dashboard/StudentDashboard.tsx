import { ArrowRight, Globe, FileCheck, CheckCircle2, TrendingUp, Sparkles, Zap, Award, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, colorClass, gradientClass, delay }: any) => (
  <div
    className={`glass-card rounded-[2rem] p-8 relative overflow-hidden group hover:-translate-y-2 animate-fade-in-up`}
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradientClass} opacity-10 rounded-bl-[4rem] transition-transform duration-700 group-hover:scale-125`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-slate-400 text-[11px] font-bold mb-1.5 uppercase tracking-widest">{title}</p>
        <h3 className="text-[2.5rem] font-black text-slate-800 tracking-tight leading-none">{value}</h3>
      </div>
      <div className={`p-4 rounded-[1.25rem] ${colorClass} bg-opacity-10 transition-colors duration-300 shadow-sm`}>
        <Icon className={`h-8 w-8 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
  </div>
);

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
      <h4 className="text-xl font-black text-slate-800 group-hover:text-dark-blue transition-colors">{title}</h4>
    </div>
    <p className="text-slate-500 text-[15px] font-medium mb-8 line-clamp-2 leading-relaxed">{description}</p>
    <div className="flex items-center text-accent-yellow font-black text-sm uppercase tracking-widest group-hover:text-yellow-default transition-colors">
      <span>Get Started</span>
      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-2 transition-transform duration-300" />
    </div>
  </Link>
);

export default function StudentDashboard() {
  return (
    <div className="space-y-10 animate-fade-in">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#060424] via-[#090638] to-[#1A1558] rounded-[2.5rem] p-10 md:p-14 shadow-2xl shadow-dark-blue/20 border border-white/10">
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[500px] h-[500px] bg-accent-yellow/15 rounded-full blur-[100px] pointer-events-none animate-float" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[400px] h-[400px] bg-blue-500/15 rounded-full blur-[100px] pointer-events-none animate-float" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-6 max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-accent-yellow text-[11px] font-bold uppercase tracking-widest backdrop-blur-md self-center md:self-start shadow-inner">
              <Sparkles className="h-4 w-4" />
              <span>Welcome to your future</span>
            </div>
            <h2 className="text-[3.5rem] md:text-[4.5rem] font-black text-white leading-[1.05] tracking-tight">
              Ready to start your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-yellow to-yellow-default relative">
                global journey?
                <div className="absolute bottom-1 left-0 w-full h-3 bg-accent-yellow/20 -z-10 skew-x-12" />
              </span>
            </h2>
            <p className="text-slate-300 text-lg md:text-xl max-w-xl leading-relaxed font-medium">
              Discover top universities, track your applications, and connect with advisors — all in one seamlessly designed place.
            </p>
            <div className="pt-6 flex flex-wrap gap-4 justify-center md:justify-start">
              <Link to="/dashboard/programmes" className="px-10 py-5 rounded-[1.25rem] bg-gradient-to-r from-accent-yellow to-yellow-default text-dark-blue font-black text-lg shadow-[0_0_30px_rgba(251,210,19,0.3)] hover:shadow-[0_0_40px_rgba(251,210,19,0.5)] transition-all duration-300 hover:scale-[1.02] flex items-center gap-3">
                Explore Universities
                <ArrowRight className="h-6 w-6" />
              </Link>
            </div>
          </div>
          <div className="hidden lg:block relative mr-8 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-accent-yellow/20 to-transparent rounded-full blur-3xl transform scale-150 group-hover:scale-[1.6] transition-transform duration-700" />
            <Globe className="h-[280px] w-[280px] text-white/5 animate-[spin_60s_linear_infinite]" strokeWidth={0.5} />
            <Award className="h-32 w-32 text-accent-yellow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-glow" />
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
