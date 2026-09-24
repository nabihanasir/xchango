interface UniversityStepProps {
  country: string;
  universities: string[];
  university: string;
  appliedUniversities?: string[];
  onChange: (university: string) => void;
}

export default function UniversityStep({
  country,
  universities,
  university,
  appliedUniversities = [],
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
      {universities.map((option) => {
        const alreadyApplied = appliedUniversities.includes(option);

        return (
          <button
            key={option}
            type="button"
            disabled={alreadyApplied}
            onClick={() => onChange(option)}
            className={`rounded-[1.75rem] border p-6 text-left transition ${
              alreadyApplied
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : university === option
                  ? 'border-dark-blue bg-dark-blue text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-dark-blue/30'
            }`}
          >
            <p className="text-xs font-black uppercase tracking-[0.25em] opacity-70">{country}</p>
            <p className="mt-3 text-xl font-black">{option}</p>
            {alreadyApplied ? (
              <p className="mt-2 text-xs font-semibold">You already have an application here</p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
