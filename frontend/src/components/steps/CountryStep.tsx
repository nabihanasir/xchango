import CountryFlag from '../CountryFlag';
import type { ApplicationCountry } from '../../types/application';
import type { CatalogCountry } from '../../types/university';

interface CountryStepProps {
  countries: CatalogCountry[];
  loading?: boolean;
  error?: string;
  country: ApplicationCountry | '';
  onChange: (country: ApplicationCountry) => void;
}

export default function CountryStep({ countries, loading = false, error = '', country, onChange }: CountryStepProps) {
  if (loading) {
    return <p className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">Loading destinations...</p>;
  }

  if (error || !countries.length) {
    return (
      <p className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
        {error || 'No destination countries are open for applications yet. Please check back soon.'}
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {countries.map((option) => (
        <button
          key={option._id}
          type="button"
          onClick={() => onChange(option.name)}
          className={`rounded-[1.75rem] border p-6 text-left transition ${
            country === option.name
              ? 'border-dark-blue bg-dark-blue text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-dark-blue/30'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em] opacity-70">Destination</p>
          <p className="mt-3 flex items-center gap-3 text-xl font-bold">
            <CountryFlag code={option.code} emoji={option.flag} />
            {option.name}
          </p>
        </button>
      ))}
    </div>
  );
}
