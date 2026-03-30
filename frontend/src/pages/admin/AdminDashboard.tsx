import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { adminStats, countryData, monthlyTrend } from '../../data/adminData';
import StatCard from '../../components/admin/StatCard';
import { Sparkles, TrendingUp, Globe } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card rounded-[2rem] p-8 lg:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent-yellow/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-[11px] font-bold uppercase tracking-widest mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Overview Report</span>
          </div>
          <h2 className="text-[2.5rem] font-black text-slate-800 tracking-tight leading-none mb-2">Welcome Back, Admin!</h2>
          <p className="text-slate-500 font-medium text-[15px]">Here's what's happening with Xchango today.</p>
        </div>
        <div className="hidden md:flex items-center gap-4 bg-slate-50 border border-slate-200 p-5 rounded-[1.25rem] shadow-sm relative z-10">
           <div className="text-right">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">System Status</p>
             <p className="text-[15px] font-bold text-emerald-500">All Systems Operational</p>
           </div>
           <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {adminStats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Applications Trend */}
        <div className="glass-card rounded-[2rem] p-6 lg:p-8 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              Monthly Trend
            </h3>
            <select className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-500 focus:ring-2 focus:ring-accent-yellow/20 rounded-xl px-4 py-2 outline-none transition-all cursor-pointer">
              <option>Last 7 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#090638" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#090638" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  itemStyle={{ color: '#090638', fontWeight: 800 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="apps" 
                  stroke="#090638" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorApps)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Applications per Country */}
        <div className="glass-card rounded-[2rem] p-6 lg:p-8 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-accent-yellow/10 rounded-xl">
                <Globe className="h-5 w-5 text-yellow-default" />
              </div>
              Applications by Country
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{fill: '#090638', fontSize: 11, fontWeight: 800}}
                />
                <Tooltip 
                  cursor={{fill: '#F8FAFC'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="applications" 
                  fill="#FBD213" 
                  radius={[0, 10, 10, 0]} 
                  barSize={24}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
