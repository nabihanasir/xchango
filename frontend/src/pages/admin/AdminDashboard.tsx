import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { adminStats, countryData, monthlyTrend } from '../../data/adminData';
import StatCard from '../../components/admin/StatCard';
import { Sparkles, TrendingUp, Globe } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl border border-light-color/50 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 text-accent-yellow text-xs font-bold uppercase tracking-widest mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Overview Report</span>
          </div>
          <h2 className="text-3xl font-black text-dark-blue">Welcome Back, Admin!</h2>
          <p className="text-body-text font-medium mt-1">Here's what's happening with Xchango today.</p>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-light-color/40">
           <div className="text-right">
             <p className="text-xs font-bold text-body-text/60 uppercase">System Status</p>
             <p className="text-sm font-black text-green-500">All Systems Operational</p>
           </div>
           <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
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
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-light-color/50 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-dark-blue flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Monthly Application Trend
            </h3>
            <select className="bg-slate-50 border-none text-xs font-bold text-dark-blue/60 focus:ring-0 rounded-lg px-3 py-1.5">
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
                  tick={{fill: '#6B6B6B', fontSize: 12, fontWeight: 600}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B6B6B', fontSize: 12, fontWeight: 600}} 
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
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-light-color/50 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-dark-blue flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent-yellow" />
              Applications per Country
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
                  tick={{fill: '#090638', fontSize: 12, fontWeight: 700}}
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
