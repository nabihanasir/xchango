interface PageBannerProps {
  title: string;
  description: string;
  /** Tailwind classes for the banner's background and shadow, so each portal keeps its own colour. */
  toneClass: string;
}

/** The slim banner shown at the top of every sidebar page. */
export default function PageBanner({ title, description, toneClass }: PageBannerProps) {
  return (
    <header className={`mb-6 rounded-[1.75rem] px-6 py-5 text-white shadow-lg md:px-8 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-yellow">{title}</p>
      <h1 className="mt-1 text-2xl font-bold md:text-3xl">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-200">{description}</p>
    </header>
  );
}
