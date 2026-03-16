import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, ChevronRight, School,
  GraduationCap, FileCheck, Upload, MapPin, Hash, Mail, BookOpen
} from 'lucide-react';
import Button from '../../components/Button';

// ── Static data ──────────────────────────────────────────────────────────────
const COUNTRIES = [
  { name: 'South Korea', flag: '🇰🇷' },
  { name: 'Malaysia',    flag: '🇲🇾' },
  { name: 'Turkiye',     flag: '🇹🇷' },
];

const UNIVERSITIES: Record<string, { name: string; location: string }[]> = {
  'South Korea': [{ name: 'Kyungdong University Global', location: 'Goseong, South Korea' }],
  'Malaysia':    [{ name: 'Universiti Telekom Sdn Bhd (Multimedia University)', location: 'Cyberjaya, Malaysia' }],
  'Turkiye':     [{ name: 'Istanbul Aydin University', location: 'Istanbul, Turkiye' }],
};

const PROGRAMS = [
  'Software Engineering',
  'Computer Science',
  'Computer Arts',
  'Artificial Intelligence',
  'Cybersecurity',
];

const STEPS = [
  { id: 1, title: 'Country',     icon: MapPin },
  { id: 2, title: 'University',  icon: School },
  { id: 3, title: 'Program',     icon: GraduationCap },
  { id: 4, title: 'Eligibility', icon: FileCheck },
  { id: 5, title: 'Documents',   icon: Upload },
];

const DOCS: { id: 'transcript' | 'passport' | 'recommendation' | 'bonafide'; label: string }[] = [
  { id: 'transcript',     label: 'University Transcript' },
  { id: 'passport',       label: 'Passport Copy' },
  { id: 'recommendation', label: 'Recommendation Letter' },
  { id: 'bonafide',       label: 'Bonafide Certificate' },
];

// ── Shared label/input style helpers ─────────────────────────────────────────
const fieldLabel = 'block text-xs font-bold text-dark-blue uppercase tracking-wider mb-1';
const fieldInput = 'block w-full px-4 py-3 border border-light-color rounded-lg focus:outline-none focus:ring-2 focus:ring-dark-blue focus:border-transparent text-body-text transition-all placeholder-gray-400';

// ── Component ─────────────────────────────────────────────────────────────────
export default function ApplicationWizard() {
  const navigate = useNavigate();
  const [step, setStep]   = useState(1);

  // selections
  const [country,     setCountry]     = useState('');
  const [university,  setUniversity]  = useState('');
  const [program,     setProgram]     = useState('');

  // eligibility
  const [sapId,       setSapId]       = useState('');
  const [semester,    setSemester]    = useState('');
  const [email,       setEmail]       = useState('');
  const [travel,      setTravel]      = useState('');
  const [passport,    setPassport]    = useState('');
  const [financial,   setFinancial]   = useState(false);
  const [extension,   setExtension]   = useState(false);

  // documents
  const [docs, setDocs] = useState({
    transcript: null as File | null,
    passport:   null as File | null,
    recommendation: null as File | null,
    bonafide:   null as File | null,
  });

  // ── Validation per step ──────────────────────────────────────────────────
  const canProceed = () => {
    if (step === 1) return !!country;
    if (step === 2) return !!university;
    if (step === 3) return !!program;
    if (step === 4) return !!(sapId && semester && email && travel && passport && financial && extension);
    if (step === 5) return !!(docs.transcript && docs.passport && docs.recommendation && docs.bonafide);
    return false;
  };

  const handleNext = () => {
    if (step < STEPS.length) { setStep(s => s + 1); }
    else { navigate('/dashboard/applications'); }
  };

  const handleBack = () => {
    if (step > 1) { setStep(s => s - 1); }
    else { navigate('/dashboard/applications'); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof docs) => {
    if (e.target.files?.[0]) setDocs(d => ({ ...d, [key]: e.target.files![0] }));
  };

  // ── Progress bar ─────────────────────────────────────────────────────────
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 animate-fade-in">

      {/* ── Card: header + progress ── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-light-color/50 shadow-sm">

        {/* back + title */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-light-color text-body-text hover:text-dark-blue transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-dark-blue leading-tight">
              Create New Application
            </h2>
            <p className="text-xs text-body-text mt-0.5">Step {step} of {STEPS.length} — {STEPS[step - 1].title}</p>
          </div>
        </div>

        {/* step indicators */}
        <div className="relative">
          {/* track */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-light-color"></div>
          {/* fill */}
          <div
            className="absolute top-5 left-5 h-0.5 bg-accent-yellow transition-all duration-500"
            style={{ width: `calc(${progress}% * (100% - 2.5rem) / 100)` }}
          ></div>

          <div className="flex justify-between relative z-10">
            {STEPS.map(s => {
              const Icon   = s.icon;
              const past   = s.id < step;
              const active = s.id === step;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    past   ? 'bg-accent-yellow border-accent-yellow' :
                    active ? 'bg-white border-accent-yellow shadow-md shadow-accent-yellow/20' :
                             'bg-white border-light-color'
                  }`}>
                    {past
                      ? <CheckCircle2 className="h-5 w-5 text-white" />
                      : <Icon className={`h-5 w-5 ${active ? 'text-accent-yellow' : 'text-gray-400'}`} />}
                  </div>
                  <span className={`text-[10px] font-bold hidden sm:block ${active ? 'text-dark-blue' : 'text-gray-400'}`}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Card: step body ── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-light-color/50 shadow-sm min-h-64">

        {/* Step 1 – Country */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <h3 className="text-lg font-bold text-dark-blue mb-5">Where do you want to study?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {COUNTRIES.map(c => (
                <button
                  key={c.name}
                  onClick={() => { setCountry(c.name); setUniversity(''); }}
                  className={`p-6 rounded-2xl border-2 text-left transition-all hover:-translate-y-1 cursor-pointer ${
                    country === c.name
                      ? 'border-accent-yellow bg-accent-yellow/5'
                      : 'border-light-color/50 hover:border-dark-blue/20'
                  }`}
                >
                  <span className="text-4xl block mb-3">{c.flag}</span>
                  <span className="font-bold text-dark-blue">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 – University */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <h3 className="text-lg font-bold text-dark-blue mb-5">
              Select a university in {country}
            </h3>
            <div className="space-y-3">
              {(UNIVERSITIES[country] ?? []).map(u => (
                <button
                  key={u.name}
                  onClick={() => setUniversity(u.name)}
                  className={`w-full p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                    university === u.name
                      ? 'border-accent-yellow bg-accent-yellow/5'
                      : 'border-light-color/50 hover:border-dark-blue/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${university === u.name ? 'bg-accent-yellow text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <School className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-dark-blue text-sm">{u.name}</p>
                      <p className="text-xs text-body-text flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {u.location}
                      </p>
                    </div>
                  </div>
                  {university === u.name && <CheckCircle2 className="h-5 w-5 text-accent-yellow flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 – Program */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            <h3 className="text-lg font-bold text-dark-blue mb-5">Select degree program</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROGRAMS.map(p => (
                <button
                  key={p}
                  onClick={() => setProgram(p)}
                  className={`p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                    program === p
                      ? 'border-accent-yellow bg-accent-yellow/5'
                      : 'border-light-color/50 hover:border-dark-blue/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className={`h-4 w-4 ${program === p ? 'text-accent-yellow' : 'text-gray-400'}`} />
                    <span className={`font-medium text-sm ${program === p ? 'text-dark-blue' : 'text-body-text'}`}>{p}</span>
                  </div>
                  {program === p && <CheckCircle2 className="h-4 w-4 text-accent-yellow flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 – Eligibility */}
        {step === 4 && (
          <div className="animate-fade-in-up space-y-5">
            <h3 className="text-lg font-bold text-dark-blue">Eligibility Check</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* SAP ID */}
              <div>
                <label className={fieldLabel}>SAP ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="h-4 w-4 text-body-text" />
                  </div>
                  <input
                    type="text"
                    value={sapId}
                    onChange={e => setSapId(e.target.value)}
                    placeholder="e.g. 70012345"
                    className={`${fieldInput} pl-9`}
                  />
                </div>
              </div>

              {/* Semester */}
              <div>
                <label className={fieldLabel}>Current Semester</label>
                <input
                  type="text"
                  value={semester}
                  onChange={e => setSemester(e.target.value)}
                  placeholder="e.g. 5th"
                  className={fieldInput}
                />
              </div>

              {/* Email */}
              <div className="sm:col-span-2">
                <label className={fieldLabel}>University Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-body-text" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className={`${fieldInput} pl-9`}
                  />
                </div>
              </div>

              {/* Travel history */}
              <div className="sm:col-span-2">
                <label className={fieldLabel}>Any Travel History?</label>
                <textarea
                  value={travel}
                  onChange={e => setTravel(e.target.value)}
                  rows={3}
                  placeholder="Briefly describe any past international travel, or write 'None'"
                  className={`${fieldInput} resize-none`}
                />
              </div>
            </div>

            {/* Passport */}
            <div>
              <label className={fieldLabel}>Passport Status</label>
              <div className="flex gap-6 mt-1">
                {['Valid', 'Invalid / Expired'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="passport"
                      value={opt}
                      checked={passport === opt}
                      onChange={() => setPassport(opt)}
                      className="w-4 h-4 accent-accent-yellow"
                    />
                    <span className="text-sm text-body-text">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4 pt-4 border-t border-light-color">
              {[
                {
                  id: 'financial', checked: financial, onChange: setFinancial,
                  label: 'I confirm that I am financially eligible to bear the expenses of this exchange program.'
                },
                {
                  id: 'extension', checked: extension, onChange: setExtension,
                  label: 'I understand my degree timeline might be extended as a result of participating in this program.'
                },
              ].map(({ id, checked, onChange, label }) => (
                <label key={id} className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => onChange(e.target.checked)}
                      className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded transition-colors
                        checked:bg-accent-yellow checked:border-accent-yellow focus:ring-2 focus:ring-accent-yellow/40"
                    />
                    <CheckCircle2 className="h-3 w-3 text-white absolute top-1 left-1 pointer-events-none opacity-0 peer-checked:opacity-100" />
                  </div>
                  <span className="text-sm text-body-text leading-snug group-hover:text-dark-blue transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 5 – Documents */}
        {step === 5 && (
          <div className="animate-fade-in-up">
            <h3 className="text-lg font-bold text-dark-blue mb-2">Document Submission</h3>
            <p className="text-sm text-body-text mb-6">Upload scanned copies or PDFs of the required documents.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {DOCS.map(doc => {
                const file = docs[doc.id];
                return (
                  <label
                    key={doc.id}
                    className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all hover:bg-light-color/10 ${
                      file ? 'border-green-400 bg-green-50' : 'border-light-color hover:border-dark-blue/30'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => handleFile(e, doc.id)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className={`p-3 rounded-full ${file ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {file ? <CheckCircle2 className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                    </div>
                    <div className="text-center pointer-events-none">
                      <p className="font-bold text-sm text-dark-blue">{doc.label}</p>
                      <p className="text-xs text-body-text mt-0.5 truncate max-w-[160px]">
                        {file ? file.name : 'Click to upload'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-body-text hover:text-dark-blue transition-colors"
        >
          {step === 1 ? 'Cancel' : '← Back'}
        </button>

        <div className="w-52">
          <Button
            type="button"
            variant="primary"
            disabled={!canProceed()}
            onClick={handleNext}
            className="flex items-center justify-center gap-2"
          >
            {step === STEPS.length ? 'Submit Application' : 'Continue'}
            {step < STEPS.length && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
        @keyframes fade-in-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .animate-fade-in { animation: fade-in 0.35s ease-out both; }
        .animate-fade-in-up { animation: fade-in-up 0.35s ease-out both; }
      `}</style>
    </div>
  );
}
