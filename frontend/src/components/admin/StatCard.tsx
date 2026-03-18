
import { Users, FileText, CheckCircle, Clock, TrendingUp, type LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  'users': Users,
  'file-text': FileText,
  'check-circle': CheckCircle,
  'clock': Clock,
};

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  trend: string;
  color: string;
}

export default function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  const Icon = iconMap[icon] || TrendingUp;
  
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-400 text-blue-500',
    yellow: 'from-accent-yellow to-yellow-500 text-accent-yellow',
    green: 'from-green-500 to-emerald-400 text-green-500',
    purple: 'from-purple-500 to-pink-400 text-purple-500',
  };

  const selectedColor = colorMap[color] || colorMap.blue;
  const [gradient, textCol] = selectedColor.split(' text-');

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-black/5 border border-light-color/50 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-5 rounded-bl-full transition-transform duration-500 group-hover:scale-110`} />
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-body-text text-xs font-semibold mb-1 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold text-dark-blue">{value}</h3>
          <div className="mt-2 flex items-center gap-1">
            <TrendingUp className={`h-3 w-3 ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-xs font-bold ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
              {trend}
            </span>
            <span className="text-xs text-body-text ml-1 opacity-60">vs last month</span>
          </div>
        </div>
        <div className={`p-3 rounded-xl bg-light-color/30 group-hover:bg-white transition-colors duration-300`}>
          <Icon className={`h-6 w-6 ${textCol}`} />
        </div>
      </div>
    </div>
  );
}
