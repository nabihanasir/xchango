import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = 'Select options',
  className = '',
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const toggle = (option: string) =>
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center justify-between gap-3 text-left ${className}`}
      >
        <span className={`truncate ${selected.length ? '' : 'text-slate-400'}`}>
          {selected.length ? selected.join(', ') : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl"
        >
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <li key={option} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => toggle(option)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {option}
                  {isSelected ? <Check className="h-4 w-4 text-dark-blue" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
