import type { ApplicationCountry } from '../../types/application';

interface CountryStepProps {
  country: ApplicationCountry | '';
  onChange: (country: ApplicationCountry) => void;
}

const countries: ApplicationCountry[] = ['Malaysia', 'South Korea', 'Turkey'];

export default function CountryStep({ country, onChange }: CountryStepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {countries.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-[1.75rem] border p-6 text-left transition ${
            country === option
              ? 'border-dark-blue bg-dark-blue text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-dark-blue/30'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em] opacity-70">Destination</p>
          <p className="mt-3 text-xl font-bold">{option}</p>
        </button>
      ))}
    </div>
  );
}
