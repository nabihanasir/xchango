interface DocumentTypePickerProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export default function DocumentTypePicker({ options, value, onChange }: DocumentTypePickerProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-600">Document type</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              value === option.value
                ? 'border-dark-blue bg-dark-blue text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-dark-blue/40'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
