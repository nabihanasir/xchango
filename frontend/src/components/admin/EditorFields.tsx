import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export const fieldClass =
  'w-full rounded-xl border border-light-color bg-slate-50 px-4 py-2.5 text-sm font-medium text-maroon transition-all focus:border-accent-yellow focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 disabled:cursor-not-allowed disabled:opacity-60';

export const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-widest text-maroon/60';

export type Confidence = 'found' | 'review' | 'empty';

const CONFIDENCE_STYLES: Record<Confidence, { label: string; className: string }> = {
  found: { label: 'Found on website', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  review: { label: 'Review before saving', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  empty: { label: 'Not found - fill in', className: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

export function ConfidenceBadge({ value }: { value?: Confidence }) {
  if (!value) return null;
  const style = CONFIDENCE_STYLES[value];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${style.className}`}>
      {style.label}
    </span>
  );
}

export function Section({
  title,
  hint,
  confidence,
  children,
}: {
  title: string;
  hint?: string;
  confidence?: Confidence;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-light-color/70 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-base font-bold text-maroon">{title}</h3>
        <ConfidenceBadge value={confidence} />
      </div>
      {hint ? <p className="-mt-2 mb-4 text-xs font-medium text-body-text">{hint}</p> : null}
      {children}
    </section>
  );
}

/** A list of free-text items, one multi-line box each (about paragraphs, highlights, requirements, steps). */
export function TextListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  rows = 2,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <textarea
            rows={rows}
            value={item}
            placeholder={placeholder}
            onChange={(event) => onChange(items.map((current, i) => (i === index ? event.target.value : current)))}
            className={`${fieldClass} resize-y`}
          />
          <button
            type="button"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="mt-1 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <AddButton onClick={() => onChange([...items, ''])}>{addLabel}</AddButton>
    </div>
  );
}

export interface RowColumn<T> {
  key: keyof T & string;
  label: string;
  placeholder?: string;
  /** Grid column span out of 6. */
  span?: number;
  type?: 'text' | 'textarea' | 'date' | 'number' | 'select';
  options?: Array<{ value: string; label: string }>;
}

/** A list of structured rows (programmes, costs, FAQs...), edited as small forms. */
export function RowsEditor<T extends object>({
  rows,
  columns,
  onChange,
  blank,
  addLabel,
}: {
  rows: T[];
  columns: Array<RowColumn<T>>;
  onChange: (rows: T[]) => void;
  blank: () => T;
  addLabel: string;
}) {
  const update = (index: number, key: keyof T & string, value: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={index} className="rounded-xl border border-light-color/80 bg-slate-50/60 p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            {columns.map((column) => {
              const value = String((row as Record<string, unknown>)[column.key] ?? '');
              return (
                <label key={column.key} className={`block ${spanClass(column.span)}`}>
                  <span className={labelClass}>{column.label}</span>
                  <div>
                    {column.type === 'textarea' ? (
                      <textarea
                        rows={2}
                        value={value}
                        placeholder={column.placeholder}
                        onChange={(event) => update(index, column.key, event.target.value)}
                        className={`${fieldClass} resize-y`}
                      />
                    ) : column.type === 'select' ? (
                      <select
                        value={value}
                        onChange={(event) => update(index, column.key, event.target.value)}
                        className={fieldClass}
                      >
                        {column.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={column.type ?? 'text'}
                        min={column.type === 'number' ? 0 : undefined}
                        value={value}
                        placeholder={column.placeholder}
                        onChange={(event) => update(index, column.key, event.target.value)}
                        className={fieldClass}
                      />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      ))}
      <AddButton onClick={() => onChange([...rows, blank()])}>{addLabel}</AddButton>
    </div>
  );
}

// Each column fills the 6-column grid; written out in full so Tailwind can see the class names.
const SPAN_CLASSES: Record<number, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
};

function spanClass(span = 3) {
  return SPAN_CLASSES[span] ?? SPAN_CLASSES[3];
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-maroon/30 px-3.5 py-2 text-xs font-bold text-maroon transition hover:border-maroon hover:bg-maroon/5"
    >
      <Plus className="h-3.5 w-3.5" /> {children}
    </button>
  );
}
