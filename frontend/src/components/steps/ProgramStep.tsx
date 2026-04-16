interface ProgramStepProps {
  program: string;
  onChange: (program: string) => void;
}

const PROGRAM_OPTIONS = [
  'Bachelors in Software engineering',
  'bachelors in computer science',
  'bachelors in Artificial Intelligence',
  'Bachelors in Cyber Security',
];

export default function ProgramStep({ program, onChange }: ProgramStepProps) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <label className="space-y-3">
        <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Program</span>
        <select
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10"
          value={program}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select a program</option>
          {PROGRAM_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
