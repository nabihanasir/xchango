interface UniversityStepProps {
  country: string;
  universities: string[];
  university: string;
  onChange: (university: string) => void;
}

export default function UniversityStep({
  country,
  universities,
  university,
  onChange,
}: UniversityStepProps) {
  if (!country) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
        Select a country first to see available universities.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {universities.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-[1.75rem] border p-6 text-left transition ${
            university === option
              ? 'border-dark-blue bg-dark-blue text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-dark-blue/30'
          }`}
        >
          <p className="text-xs font-black uppercase tracking-[0.25em] opacity-70">{country}</p>
          <p className="mt-3 text-xl font-black">{option}</p>
        </button>
      ))}
    </div>
  );
}
