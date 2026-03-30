import { Sparkles, TrendingUp, CheckCircle, Clock, Users } from 'lucide-react';

const AdvisorStatCard = ({ title, value, icon: Icon, colorClass }: any) => (
  <div className="glass-card p-8 rounded-[2rem] flex items-center justify-between relative overflow-hidden group hover:-translate-y-2 transition-all duration-300">
    <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-bl-[4rem] transition-transform duration-700 group-hover:scale-125 ${colorClass}`} />
    <div className="relative z-10">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{title}</p>
      <h3 className="text-[2.5rem] font-black text-slate-800 tracking-tight leading-none">{value}</h3>
    </div>
    <div className={`p-4 rounded-[1.25rem] ${colorClass} bg-opacity-10 transition-colors duration-300 relative z-10`}>
      <Icon className={`h-8 w-8 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
  </div>
);

export default function AdvisorDashboard() {
  const stats = [
    { title: 'Assigned Students', value: '12', icon: Users, colorClass: 'bg-blue-500' },
    { title: 'Pending Reviews', value: '4', icon: Clock, colorClass: 'bg-accent-yellow' },
    { title: 'Approved Apps', value: '8', icon: CheckCircle, colorClass: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="glass-card p-8 lg:p-10 rounded-[2rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent-yellow/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-[11px] font-bold uppercase tracking-widest mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Advisor Overview</span>
          </div>
          <h2 className="text-[2.5rem] font-black text-slate-800 tracking-tight leading-none mb-2">Welcome back, Advisor!</h2>
          <p className="text-slate-500 font-medium text-[15px]">Review student applications and provide feedback.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <AdvisorStatCard key={idx} {...stat} />
        ))}
      </div>

      <div className="glass-card p-8 lg:p-10 rounded-[2rem]">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl">
             <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          Recent Activity
        </h3>
        <p className="text-slate-500 italic font-medium">No recent activity logs found.</p>
      </div>
    </div>
  );
}
