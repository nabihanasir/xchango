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
import { ArrowRight, BookOpen, Globe, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminHeroCarousel from '../../components/admin/AdminHeroCarousel';
import StatCard from '../../components/admin/StatCard';
import { adminApi, type AdminDashboardMetrics } from '../../lib/adminApi';
import Notice from '../../components/Notice';

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
      <AdminHeroCarousel stats={metrics.adminStats} />

      {error ? (
        <Notice tone="error">{error}</Notice>
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
            <h3 className="flex items-center gap-3 text-xl font-bold text-slate-800">
              <div className="rounded-xl bg-admin/10 p-2">
                <TrendingUp className="h-5 w-5 text-admin" />
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
                  <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} dy={10} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} tickLine={false} />
                  <YAxis axisLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ color: '#A16207', fontWeight: 800 }}
                  />
                  <Area type="monotone" dataKey="apps" stroke="#A16207" strokeWidth={4} fill="#A16207" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-card relative overflow-hidden rounded-[2rem] p-6 lg:p-8">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="flex items-center gap-3 text-xl font-bold text-slate-800">
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
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 800 }}
                    tickLine={false}
                    type="category"
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#F8FAFC' }}
                  />
                  <Bar dataKey="applications" fill="#A16207" radius={[0, 10, 10, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <section className="glass-card rounded-[2rem] border border-slate-200 bg-white p-6 lg:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-yellow/20 bg-accent-yellow/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-accent-yellow">
              <BookOpen className="h-3.5 w-3.5" />
              Home Course Catalog
            </div>
            <h3 className="mt-4 text-2xl font-bold text-slate-800">Manage the central home-course list</h3>
            <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
              Add, edit, and delete the home courses that advisors use while pairing student requests.
            </p>
          </div>
          <Link
            to="/admin/courses"
            className="inline-flex items-center gap-2 rounded-[1.25rem] bg-admin hover:bg-admin-hover px-5 py-3 text-sm font-bold text-white transition hover:brightness-110"
          >
            Open Home Courses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
