interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}

/** Centred section heading — the repeating rhythm between content blocks. */
export default function SectionHeading({ eyebrow, title, children }: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p className="text-xs font-black uppercase tracking-[0.32em] text-yellow-default">{eyebrow}</p>
      ) : null}
      <h2 className="mt-4 text-3xl font-black tracking-tight text-head-text sm:text-4xl">{title}</h2>
      <span className="mx-auto mt-6 block h-1 w-16 rounded-full bg-accent-yellow" />
      {children ? <p className="mt-6 text-base leading-8 text-slate-600">{children}</p> : null}
    </div>
  );
}
