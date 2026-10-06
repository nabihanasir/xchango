import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsePanelProps {
  id?: string;
  open: boolean;
  children: ReactNode;
}

/** The animated body of a collapsible section: height and opacity ease in and out, and hidden content is skipped by keyboard and screen readers. */
export function CollapsePanel({ id, open, children }: CollapsePanelProps) {
  return (
    <div
      id={id}
      className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="min-h-0 overflow-hidden" inert={!open}>
        <div className={`transition-opacity duration-300 motion-reduce:transition-none ${open ? 'opacity-100' : 'opacity-0'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

interface CollapsibleProps {
  /** The always-visible heading. */
  title: ReactNode;
  /** A short summary shown next to the heading, so the section can stay closed. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  /** Controlled mode: the parent decides whether the section is open. */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  /** 'plain' has no frame, for sections nested inside a card. */
  variant?: 'card' | 'plain';
  className?: string;
  children: ReactNode;
}

/** A section that opens and closes with a smooth height animation. */
export default function Collapsible({
  title,
  summary,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  variant = 'plain',
  className = '',
  children,
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const panelId = useId();
  const isOpen = controlledOpen ?? internalOpen;

  const toggle = () => {
    const next = !isOpen;
    if (controlledOpen === undefined) {
      setInternalOpen(next);
    }
    onToggle?.(next);
  };

  const frame =
    variant === 'card'
      ? 'rounded-[1.5rem] border border-slate-200 bg-white/80 shadow-soft'
      : 'rounded-[1.25rem] border border-slate-200 bg-slate-50/70';

  return (
    <div className={`${frame} ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 rounded-[inherit] px-4 py-3 text-left transition-colors hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow/60"
      >
        <span className="min-w-0 flex-1 text-sm font-bold text-slate-700">{title}</span>
        {summary ? <span className="hidden shrink-0 text-xs font-semibold text-slate-500 sm:block">{summary}</span> : null}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <CollapsePanel id={panelId} open={isOpen}>
        <div className="px-4 pb-4 pt-1">{children}</div>
      </CollapsePanel>
    </div>
  );
}
