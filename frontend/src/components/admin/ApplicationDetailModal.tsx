import { X, Mail, Phone, Calendar, Hash, Target, GraduationCap, MapPin, CheckCircle2, Calculator } from 'lucide-react';
import TranscriptCalculator from './TranscriptCalculator';
import StatusBadge from './StatusBadge';

interface ApplicationDetailModalProps {
  app: any;
  onClose: () => void;
}

const WIZARD_STEPS = [
  { id: 1, title: 'Country', icon: MapPin },
  { id: 2, title: 'University', icon: GraduationCap },
  { id: 3, title: 'Program', icon: Target },
  { id: 4, title: 'Eligibility', icon: Hash },
  { id: 5, title: 'Documents', icon: Hash },
];

export default function ApplicationDetailModal({ app, onClose }: ApplicationDetailModalProps) {
  if (!app) return null;

  const { details } = app;
  const progressPercent = (details.currentStage / 5) * 100;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:p-10 animate-fade-in relative">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-blue/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="bg-slate-50 w-full max-w-6xl h-full max-h-[90vh] rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-fade-in-up border border-white/20">
        
        {/* Header */}
        <header className="bg-white px-8 py-6 border-b border-light-color/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-5">
            <div className="bg-dark-blue h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-dark-blue/10">
              <span className="text-white font-black text-xl italic leading-none">{app.student.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-dark-blue">{app.student}</h2>
                <StatusBadge status={app.status} />
              </div>
              <p className="text-body-text font-bold text-sm opacity-60 mt-1">
                Application ID: <span className="text-dark-blue">#{app.id}</span> · Joined {app.date}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-dark-blue/40 hover:text-dark-blue border border-transparent hover:border-light-color"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Left Column: Profile & Progress */}
            <div className="space-y-8">
              {/* Profile Card */}
              <div className="bg-white p-6 rounded-3xl border border-light-color/40 shadow-sm space-y-6">
                <h4 className="text-xs font-black text-dark-blue/40 uppercase tracking-[0.2em]">Student Information</h4>
                
                <div className="grid grid-cols-1 gap-4">
                  <ProfileItem icon={Calendar} label="Age" value={`${details.age} Years`} />
                  <ProfileItem icon={Hash} label="SAP ID" value={details.sapId} />
                  <ProfileItem icon={GraduationCap} label="Current Semester" value={details.semester} />
                  <ProfileItem icon={Calculator} label="Current CGPA" value={details.cgpa.toFixed(2)} highlighted />
                  <div className="h-px bg-slate-50 my-2" />
                  <ProfileItem icon={Mail} label="Email Address" value={details.email} />
                  <ProfileItem icon={Phone} label="Contact Number" value={details.contactNo} />
                </div>
              </div>

              {/* Destination Card */}
              <div className="bg-white p-6 rounded-3xl border border-light-color/40 shadow-sm space-y-6">
                <h4 className="text-xs font-black text-dark-blue/40 uppercase tracking-[0.2em]">Preferences</h4>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-body-text/40 uppercase tracking-widest block mb-1">Country of Choice</span>
                    <div className="flex items-center gap-2 text-sm font-bold text-dark-blue">
                      <MapPin className="h-4 w-4 text-accent-yellow" />
                      {details.countryOfChoice}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-body-text/40 uppercase tracking-widest block mb-1">University of Choice</span>
                    <div className="flex items-center gap-2 text-sm font-bold text-dark-blue">
                      <GraduationCap className="h-4 w-4 text-blue-500" />
                      {app.university}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Card */}
              <div className="bg-white p-6 rounded-3xl border border-light-color/40 shadow-sm space-y-6">
                <h4 className="text-xs font-black text-dark-blue/40 uppercase tracking-[0.2em]">Application Stage</h4>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-3xl font-black text-dark-blue">{Math.round(progressPercent)}%</span>
                    <span className="text-xs font-bold text-body-text opacity-60">Step {details.currentStage} of 5</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent-yellow rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(251,210,19,0.5)]" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {WIZARD_STEPS.map((step) => (
                      <div 
                        key={step.id} 
                        className={`h-1.5 rounded-full ${step.id <= details.currentStage ? 'bg-accent-yellow' : 'bg-slate-100'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Transcript & Program */}
            <div className="lg:col-span-2 space-y-8">
              {/* Program Overview */}
              <div className="bg-dark-blue p-8 rounded-[32px] text-white relative overflow-hidden shadow-2xl shadow-dark-blue/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-yellow/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black text-accent-yellow uppercase tracking-widest">Selected Program</span>
                    <h3 className="text-3xl font-black mt-2 leading-tight">{app.program}</h3>
                    <p className="text-white/60 font-bold mt-1">{app.university}</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 hidden sm:block">
                     <CheckCircle2 className="h-8 w-8 text-accent-yellow" />
                  </div>
                </div>
              </div>

              {/* Selected Courses Section */}
              <div className="bg-white p-6 rounded-3xl border border-light-color/40 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-dark-blue/40 uppercase tracking-[0.2em]">Selected Courses</h4>
                <div className="flex flex-wrap gap-2">
                  {['Advanced AI', 'Cloud Computing', 'Human Computer Interaction', 'Ethics in Tech'].map((course, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-lg border border-blue-100 italic">
                      {course}
                    </span>
                  ))}
                </div>
              </div>

              {/* Transcript Calculator */}
              <TranscriptCalculator 
                transcript={details.transcript} 
                cgpa={details.cgpa} 
                sapId={details.sapId} 
                studentName={app.student} 
              />
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <footer className="bg-white px-8 py-6 border-t border-light-color/60 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-body-text font-bold rounded-xl transition-all"
          >
            Close View
          </button>
          <button className="px-8 py-3 bg-dark-blue hover:bg-navy-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-dark-blue/20 flex items-center gap-2">
            Update Status
            <Hash className="h-4 w-4 opacity-40 rotate-12" />
          </button>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
}

function ProfileItem({ icon: Icon, label, value, highlighted = false }: any) {
  return (
    <div className="flex items-center gap-4 group">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
        highlighted ? 'bg-accent-yellow text-dark-blue' : 'bg-slate-50 text-dark-blue/40 group-hover:bg-slate-100'
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <span className="text-[10px] font-black text-body-text/40 uppercase tracking-widest block">{label}</span>
        <span className={`text-sm font-bold ${highlighted ? 'text-dark-blue' : 'text-body-text'}`}>{value}</span>
      </div>
    </div>
  );
}
