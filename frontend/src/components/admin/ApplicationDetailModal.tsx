import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Phone, Calendar, Hash, GraduationCap, MapPin, CheckCircle2, Calculator } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { adminApi } from '../../lib/adminApi';
import type { WorkflowApplication } from '../../types/application';

interface ApplicationDetailModalProps {
  app: WorkflowApplication;
  onClose: () => void;
  onApplicationUpdate?: () => void;
}

const WIZARD_STEPS = [
  { id: 1, title: 'Draft', status: 'DRAFT' },
  { id: 2, title: 'Documents', status: 'DOCUMENT_PENDING' },
  { id: 3, title: 'Submitted', status: 'SUBMITTED' },
  { id: 4, title: 'Pending Interview', status: 'PENDING_INTERVIEW' },
  { id: 5, title: 'Shortlisted', status: 'SHORTLISTED' },
];

export default function ApplicationDetailModal({ app, onClose, onApplicationUpdate }: ApplicationDetailModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!app) return null;

  const modalRoot = document.getElementById('modal-root') || document.body;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  // Safe checks for user populated data
  const user = typeof app.studentId === 'object' && app.studentId ? app.studentId : null;
  const studentName = user?.name || 'Unknown Student';
  const sapId = user?.sapId || 'N/A';
  const email = user?.email || 'N/A';
  const phone = user?.phone || 'N/A';

  // Calculate generic progress based on WIZARD_STEPS matching status
  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.status === app.status);
  const currentStage = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;
  const progressPercent = (currentStage / 5) * 100;
  
  // Safe extraction for selected courses
  const selectedCourseNames = app.selectedCourses?.map(sc => {
      if (typeof sc.course === 'object' && sc.course) return sc.course.name;
      if (typeof sc.course === 'string') return sc.course;
      return 'Unknown Course';
  }) || [];

  const handleIssueOfferLetter = async () => {
    const url = prompt('Enter Offer Letter URL (e.g., Google Drive link):');
    if (!url) return;

    setSubmitting(true);
    try {
      await adminApi.uploadOfferLetter({
        applicationId: app._id,
        offerLetterUrl: url,
      });
      alert(`Offer Letter Issued Successfully for ${studentName}!`);
      if (onApplicationUpdate) {
        onApplicationUpdate();
      }
      onClose();
    } catch (err: any) {
      alert(`Failed to issue offer letter: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:p-10 animate-fade-in relative text-slate-800">
      <div className="absolute inset-0 bg-dark-blue/80 backdrop-blur-md" onClick={onClose} />

      <div
        className="bg-slate-50 w-full max-w-6xl h-full max-h-[90vh] rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-fade-in-up border border-white/20"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="bg-white px-8 py-6 border-b border-light-color/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-5">
            <div className="bg-dark-blue h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-dark-blue/10">
              <span className="text-white font-black text-xl italic leading-none">{studentName.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-dark-blue">{studentName}</h2>
                <StatusBadge status={app.status.toLowerCase()} />
              </div>
              <p className="text-body-text font-bold text-sm opacity-60 mt-1">
                Application ID: <span className="text-dark-blue">#{app._id.slice(-6).toUpperCase()}</span> · Created {new Date(app.createdAt).toLocaleDateString()}
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

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-3xl border border-light-color/40 shadow-sm space-y-6">
                <h4 className="text-xs font-black text-dark-blue/40 uppercase tracking-[0.2em]">Student Information</h4>
                
                <div className="grid grid-cols-1 gap-4">
                  <ProfileItem icon={Hash} label="SAP ID" value={sapId} />
                  <ProfileItem icon={Calculator} label="Current CGPA" value="N/A (Missing from DB)" highlighted />
                  <div className="h-px bg-slate-50 my-2" />
                  <ProfileItem icon={Mail} label="Email Address" value={email} />
                  <ProfileItem icon={Phone} label="Contact Number" value={phone} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-light-color/40 shadow-sm space-y-6">
                <h4 className="text-xs font-black text-dark-blue/40 uppercase tracking-[0.2em]">Preferences</h4>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-body-text/40 uppercase tracking-widest block mb-1">Country of Choice</span>
                    <div className="flex items-center gap-2 text-sm font-bold text-dark-blue">
                      <MapPin className="h-4 w-4 text-accent-yellow" />
                      {app.country || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-body-text/40 uppercase tracking-widest block mb-1">University of Choice</span>
                    <div className="flex items-center gap-2 text-sm font-bold text-dark-blue">
                      <GraduationCap className="h-4 w-4 text-blue-500" />
                      {app.university || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-light-color/40 shadow-sm space-y-6">
                <h4 className="text-xs font-black text-dark-blue/40 uppercase tracking-[0.2em]">Application Stage</h4>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-body-text opacity-60">Status Mapped Level</span>
                        <span className="text-2xl font-black text-dark-blue">{Math.round(progressPercent)}%</span>
                    </div>
                    <span className="text-xs font-bold text-body-text opacity-60">Level {currentStage} of 5</span>
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
                        title={step.title}
                        className={`h-1.5 rounded-full ${step.id <= currentStage ? 'bg-accent-yellow' : 'bg-slate-100'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="bg-dark-blue p-8 rounded-[32px] text-white relative overflow-hidden shadow-2xl shadow-dark-blue/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-yellow/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black text-accent-yellow uppercase tracking-widest">Selected Program</span>
                    <h3 className="text-3xl font-black mt-2 leading-tight">{app.program || 'General Program'}</h3>
                    <p className="text-white/60 font-bold mt-1">{app.university || 'N/A'}</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 hidden sm:block">
                     <CheckCircle2 className="h-8 w-8 text-accent-yellow" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-light-color/40 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-dark-blue/40 uppercase tracking-[0.2em]">Selected Courses</h4>
                {selectedCourseNames.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                    {selectedCourseNames.map((course, i) => (
                        <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-lg border border-blue-100 italic">
                        {course}
                        </span>
                    ))}
                    </div>
                ) : (
                    <div className="py-4 text-center rounded-xl bg-slate-50 border border-dashed border-light-color">
                        <span className="text-sm font-bold text-slate-400">No courses selected yet.</span>
                    </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-3xl border border-light-color/40 shadow-sm space-y-4 opacity-75">
                <h4 className="text-xs font-black text-dark-blue/40 uppercase tracking-[0.2em]">Transcript Calculator</h4>
                <div className="py-8 text-center rounded-xl bg-slate-50 border border-dashed border-light-color space-y-2">
                    <Calendar className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-500">Transcript data is not linked to this application format natively.</p>
                    <p className="text-xs text-slate-400">Using older calculation mock model until unified transcript endpoint is added.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        <footer className="bg-white px-8 py-6 border-t border-light-color/60 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-body-text font-bold rounded-xl transition-all"
          >
             Close View
          </button>
          {app.status === 'SHORTLISTED' && (
            <button 
              onClick={handleIssueOfferLetter}
              disabled={submitting}
              className="px-6 py-3 bg-accent-yellow text-dark-blue font-bold rounded-xl hover:bg-yellow-default transition-all shadow-lg shadow-accent-yellow/20 disabled:opacity-50"
            >
              {submitting ? 'Issuing...' : 'Issue Offer Letter'}
            </button>
          )}
          <button className="px-8 py-3 bg-dark-blue hover:bg-navy-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-dark-blue/20 flex items-center gap-2">
            Download Full Report
            <Hash className="h-4 w-4 opacity-40 rotate-12" />
          </button>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>,
    modalRoot
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
