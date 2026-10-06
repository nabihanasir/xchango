import { BookOpen, GraduationCap } from 'lucide-react';

interface CourseChipProps {
  /** Host courses are blue and home courses are violet, everywhere on the page. */
  kind: 'host' | 'home';
  name: string;
  code?: string;
  creditHours?: number;
  /** A larger chip for headings; the default fits inside a row. */
  size?: 'sm' | 'md';
}

const KIND_STYLES = {
  host: { frame: 'border-sky-200 bg-sky-50', icon: 'bg-sky-500 text-white', label: 'text-sky-700', name: 'text-sky-950', Icon: BookOpen, title: 'Host course' },
  home: { frame: 'border-violet-200 bg-violet-50', icon: 'bg-violet-500 text-white', label: 'text-violet-700', name: 'text-violet-950', Icon: GraduationCap, title: 'Home course' },
};

export default function CourseChip({ kind, name, code, creditHours, size = 'md' }: CourseChipProps) {
  const style = KIND_STYLES[kind];
  const { Icon } = style;

  return (
    <div className={`flex min-w-0 items-center gap-3 rounded-[1.1rem] border ${style.frame} ${size === 'md' ? 'px-3 py-2.5' : 'px-2.5 py-2'}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${style.label}`}>
          {style.title}
          {creditHours !== undefined ? ` · ${creditHours} CH` : ''}
        </p>
        <p className={`truncate text-sm font-bold ${style.name}`} title={name}>
          {code ? <span className="mr-1.5 font-semibold opacity-70">{code}</span> : null}
          {name}
        </p>
      </div>
    </div>
  );
}
