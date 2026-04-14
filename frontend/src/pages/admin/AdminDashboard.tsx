import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Globe, Sparkles, TrendingUp } from 'lucide-react';
import StatCard from '../../components/admin/StatCard';
import { adminApi, type AdminDashboardMetrics } from '../../lib/adminApi';

const emptyMetrics: AdminDashboardMetrics = {
  adminStats: [],
  countryData: [],
  monthlyTrend: [],
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await adminApi.getStats();
        if (!cancelled) {
          setMetrics(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard stats.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] p-8 lg:p-10 glass-card">
        <div className="absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/2 translate-x-1/4 rounded-full bg-accent-yellow/5 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-yellow/20 bg-accent-yellow/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-accent-yellow">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Overview Report</span>
            </div>
            <h2 className="mb-2 text-[2.5rem] font-black leading-none tracking-tight text-slate-800">
              Welcome Back, Admin!
            </h2>
            <p className="text-[15px] font-medium text-slate-500">
              Live metrics from the current backend state.
            </p>
          </div>
          <div className="relative z-10 hidden items-center gap-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5 shadow-sm md:flex">
            <div className="text-right">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">System Status</p>
              <p className="text-[15px] font-bold text-emerald-500">Admin API Connected</p>
            </div>
            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-[1.75rem] border border-red-200 bg-red-50 px-6 py-5 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {loading 
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-2xl border border-light-color/50 bg-white shadow-lg shadow-black/5" />
            ))
          : metrics.adminStats.map((stat, index) => (
              <StatCard key={`${stat.title}-${index}`} {...stat} />
            ))
        }
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="glass-card relative overflow-hidden rounded-[2rem] p-6 lg:p-8">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="flex items-center gap-3 text-xl font-black text-slate-800">
              <div className="rounded-xl bg-blue-500/10 p-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              Monthly Trend
            </h3>
          </div>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="h-full animate-pulse rounded-2xl bg-slate-100" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.monthlyTrend}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#090638" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#090638" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} dy={10} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} tickLine={false} />
                  <YAxis axisLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ color: '#090638', fontWeight: 800 }}
                  />
                  <Area type="monotone" dataKey="apps" stroke="#090638" strokeWidth={4} fill="url(#colorApps)" fillOpacity={1} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-card relative overflow-hidden rounded-[2rem] p-6 lg:p-8">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="flex items-center gap-3 text-xl font-black text-slate-800">
              <div className="rounded-xl bg-accent-yellow/10 p-2">
                <Globe className="h-5 w-5 text-yellow-default" />
              </div>
              Applications by Country
            </h3>
          </div>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="h-full animate-pulse rounded-2xl bg-slate-100" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.countryData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" horizontal={false} />
                  <XAxis hide type="number" />
                  <YAxis
                    axisLine={false}
                    dataKey="name"
                    tick={{ fill: '#090638', fontSize: 11, fontWeight: 800 }}
                    tickLine={false}
                    type="category"
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#F8FAFC' }}
                  />
                  <Bar dataKey="applications" fill="#FBD213" radius={[0, 10, 10, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
