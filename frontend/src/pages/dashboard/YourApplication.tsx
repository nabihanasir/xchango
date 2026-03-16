import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, AlertCircle, Plus, X, MapPin, School, GraduationCap, Upload } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Application {
  id: string;
  university: string;
  program: string;
  country: string;
  status: string;
  dateApplied: string;
  lastUpdate: string;
  step: number; // 1-5 completed steps
}

// ── Static step meta (mirrors wizard) ────────────────────────────────────────
const WIZARD_STEPS = [
  { id: 1, title: 'Country',     icon: MapPin },
  { id: 2, title: 'University',  icon: School },
  { id: 3, title: 'Program',     icon: GraduationCap },
  { id: 4, title: 'Eligibility', icon: FileText },
  { id: 5, title: 'Documents',   icon: Upload },
];

// ── Styled helpers ───────────────────────────────────────────────────────────
const statusIcon = (status: string) => {
  switch (status) {
    case 'Submitted':  return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'In Progress': return <Clock className="h-5 w-5 text-yellow-500" />;
    default:           return <AlertCircle className="h-5 w-5 text-gray-400" />;
  }
};

const statusClass = (status: string) => {
  switch (status) {
    case 'Submitted':  return 'bg-green-50 text-green-700 border-green-200';
    case 'In Progress': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    default:           return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

// ── Mini progress bar row ─────────────────────────────────────────────────────
function MiniProgress({ completedStep }: { completedStep: number }) {
  const pct = (completedStep / WIZARD_STEPS.length) * 100;
  return (
    <div className="mt-5">
      <div className="flex justify-between text-xs text-body-text mb-2 font-semibold">
        <span>Application Progress</span>
        <span>{Math.round(pct)}% ({completedStep}/{WIZARD_STEPS.length} steps)</span>
      </div>
      <div className="h-2.5 w-full bg-light-color rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-yellow rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── View Details Modal ────────────────────────────────────────────────────────
function DetailsModal({ app, onClose }: { app: Application; onClose: () => void }) {
  const pct = (app.step / WIZARD_STEPS.length) * 100;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-blue/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl animate-fade-in-up">
        {/* header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{app.id}</span>
            <h3 className="text-xl font-bold text-dark-blue mt-0.5">{app.program}</h3>
            <p className="text-sm text-body-text">{app.university} · {app.country}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-light-color rounded-xl transition-colors text-body-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* status badge */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusClass(app.status)}`}>
          {statusIcon(app.status)} {app.status}
        </span>

        {/* big progress row */}
        <div className="mt-8">
          <div className="flex justify-between text-xs text-body-text mb-2 font-medium">
            <span>Application Progress</span>
            <span>{Math.round(pct)}% — Step {app.step} of {WIZARD_STEPS.length}</span>
          </div>
          <div className="h-2 w-full bg-light-color rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-accent-yellow rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* step chips */}
          <div className="flex gap-2 flex-wrap">
            {WIZARD_STEPS.map(s => {
              const Icon = s.icon;
              const done = s.id <= app.step;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    done
                      ? 'bg-accent-yellow/10 border-accent-yellow text-dark-blue'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}
                >
                  {done
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-accent-yellow" />
                    : <Icon className="h-3.5 w-3.5" />}
                  {s.title}
                </div>
              );
            })}
          </div>
        </div>

        {/* dates */}
        <div className="mt-6 pt-5 border-t border-light-color flex gap-8 text-sm">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Applied</p>
            <p className="font-bold text-dark-blue">{app.dateApplied}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Last Update</p>
            <p className="font-bold text-dark-blue">{app.lastUpdate}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function YourApplication() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Application | null>(null);

  const applications: Application[] = [
    {
      id:          'APP-2026-001',
      university:  'Kyungdong University Global',
      program:     'BBA in International Business',
      country:     'South Korea',
      status:      'In Progress',
      dateApplied: 'Oct 15, 2026',
      lastUpdate:  'Oct 18, 2026',
      step: 3,
    },
    {
      id:          'APP-2026-002',
      university:  'Istanbul Aydin University',
      program:     'BSc in Software Engineering',
      country:     'Turkiye',
      status:      'Submitted',
      dateApplied: 'Oct 12, 2026',
      lastUpdate:  'Oct 12, 2026',
      step: 5,
    },
  ];

  return (
    <>
      {selected && (
        <DetailsModal app={selected} onClose={() => setSelected(null)} />
      )}

      <div className="space-y-6 animate-fade-in">
        {/* ── Page header ── */}
        <div className="bg-white rounded-3xl p-8 md:p-10 border border-light-color/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-dark-blue flex items-center gap-3">
              <FileText className="h-9 w-9 text-accent-yellow" />
              Your Applications
            </h2>
            <p className="text-body-text text-base mt-2">Track and manage your university applications.</p>
          </div>

          <button
            onClick={() => navigate('/dashboard/applications/new')}
            className="flex items-center gap-2 px-7 py-4 bg-dark-blue hover:bg-navy-hover text-white rounded-xl font-bold text-base transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            Create New Application
          </button>
        </div>

        {/* ── Application cards ── */}
        <div className="grid gap-6">
          {applications.map(app => (
            <div
              key={app.id}
              className="bg-white rounded-2xl border border-light-color/50 p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                {/* left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{app.id}</span>
                    <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold border ${statusClass(app.status)}`}>
                      {statusIcon(app.status)} {app.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-dark-blue truncate mb-1">{app.program}</h3>
                  <p className="text-base text-body-text">{app.university} · {app.country}</p>

                  <MiniProgress completedStep={app.step} />
                </div>

                {/* right */}
                <div className="flex flex-col items-start md:items-end gap-2 border-t md:border-t-0 border-light-color pt-5 md:pt-0 flex-shrink-0">
                  <p className="text-base text-body-text"><span className="font-bold text-gray-700">Applied:</span> {app.dateApplied}</p>
                  <p className="text-base text-body-text"><span className="font-bold text-gray-700">Updated:</span> {app.lastUpdate}</p>
                  <button
                    onClick={() => setSelected(app)}
                    className="mt-4 text-dark-blue font-bold hover:text-accent-yellow transition-colors underline decoration-2 underline-offset-4 text-base"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
        @keyframes fade-in-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .animate-fade-in { animation: fade-in 0.35s ease-out both; }
        .animate-fade-in-up { animation: fade-in-up 0.35s ease-out both; }
      `}</style>
    </>
  );
}
