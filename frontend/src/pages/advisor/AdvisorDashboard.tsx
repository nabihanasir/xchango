import { Sparkles, TrendingUp, CheckCircle, Clock, Users } from 'lucide-react';

const AdvisorStatCard = ({ title, value, icon: Icon, colorClass }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-light-color/50 shadow-sm flex items-center justify-between">
    <div>
      <p className="text-xs font-bold text-body-text/60 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-dark-blue">{value}</h3>
    </div>
    <div className={`p-4 rounded-2xl ${colorClass}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
  </div>
);

export default function AdvisorDashboard() {
  const stats = [
    { title: 'Assigned Students', value: '12', icon: Users, colorClass: 'bg-blue-500' },
    { title: 'Pending Reviews', value: '4', icon: Clock, colorClass: 'bg-accent-yellow' },
    { title: 'Approved Apps', value: '8', icon: CheckCircle, colorClass: 'bg-green-500' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-8 rounded-3xl border border-light-color/50 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 text-accent-yellow text-xs font-bold uppercase tracking-widest mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Advisor Overview</span>
          </div>
          <h2 className="text-3xl font-black text-dark-blue">Welcome back, Advisor!</h2>
          <p className="text-body-text font-medium mt-1">Review student applications and provide feedback.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <AdvisorStatCard key={idx} {...stat} />
        ))}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-light-color/50 shadow-sm">
        <h3 className="text-xl font-bold text-dark-blue mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Recent Activity
        </h3>
        <p className="text-body-text italic">No recent activity logs found.</p>
      </div>
    </div>
  );
}
