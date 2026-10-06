import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  ExternalLink,
  Globe2,
  Handshake,
  Network,
  Search,
  Telescope,
} from 'lucide-react';
import {
  RIO_WEBSITE,
  collaborationPartners,
  collaborations,
  exchangePartners,
  exchangeProgram,
  officeIntro,
} from '../../data/internationalOffice';

const advantageIcons = [Globe2, BookOpen, Telescope, Network, Award];

// Fades and slides its children in the first time they scroll into view.
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'
      } ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent-yellow">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold text-dark-blue">{title}</h2>
    </div>
  );
}

type PartnerTab = 'exchange' | 'collaboration';

export default function InternationalOffice() {
  const [tab, setTab] = useState<PartnerTab>('exchange');
  const [query, setQuery] = useState('');

  const partners = tab === 'exchange' ? exchangePartners : collaborationPartners;
  const filteredPartners = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? partners.filter((item) => `${item.name} ${item.location}`.toLowerCase().includes(needle))
      : partners;
  }, [partners, query]);

  const countryCount = useMemo(
    () => new Set([...exchangePartners, ...collaborationPartners].map((item) => item.location)).size,
    []
  );

  return (
    <div className="space-y-12 pb-12">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#060424] via-[#0c174f] to-[#17387b] p-8 text-white shadow-2xl shadow-dark-blue/20 md:p-12">
        <div className="absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/3 animate-pulse rounded-full bg-accent-yellow/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-56 w-56 -translate-x-1/4 translate-y-1/4 animate-pulse rounded-full bg-cyan-400/15 blur-3xl" />
        <Reveal className="relative z-10 max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-accent-yellow">
            <Building2 className="h-4 w-4" />
            {officeIntro.eyebrow}
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">{officeIntro.title}</h1>
          <p className="mt-4 text-base text-slate-200 md:text-lg">{officeIntro.paragraphs[0]}</p>
        </Reveal>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Exchange Partners', value: exchangePartners.length },
          { label: 'Collaboration Partners', value: collaborationPartners.length },
          { label: 'Countries', value: countryCount },
        ].map((stat, index) => (
          <Reveal key={stat.label} delay={index * 120}>
            <div className="glass-card h-full rounded-[2rem] p-6">
              <p className="text-4xl font-bold text-dark-blue">{stat.value}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-600">{stat.label}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <section>
        <Reveal>
          <SectionTitle eyebrow="Introduction" title="About the International Office" />
        </Reveal>
        <div className="space-y-4">
          {officeIntro.paragraphs.map((paragraph, index) => (
            <Reveal key={paragraph} delay={index * 100}>
              <p className="rounded-2xl border border-slate-200 bg-white p-5 leading-relaxed text-slate-700">{paragraph}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section>
        <Reveal>
          <SectionTitle eyebrow="Programme" title={exchangeProgram.title} />
          <div className="space-y-3 text-slate-700">
            {exchangeProgram.paragraphs.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
          <Link
            to="/dashboard/applications/new"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-dark-blue px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Apply Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>

        <h3 className="mb-4 mt-8 text-lg font-bold text-slate-900">Key Advantages</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exchangeProgram.advantages.map((advantage, index) => {
            const Icon = advantageIcons[index % advantageIcons.length];
            return (
              <Reveal key={advantage.title} delay={index * 100}>
                <div className="glass-card group h-full rounded-[2rem] p-6 hover:-translate-y-1">
                  <div className="inline-flex rounded-2xl bg-dark-blue p-3 text-white transition group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-lg font-bold text-slate-900">{advantage.title}</h4>
                  <p className="mt-2 text-sm text-slate-500">{advantage.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section>
        <Reveal>
          <SectionTitle eyebrow="Collaborations" title={collaborations.title} />
          <div className="space-y-3 text-slate-700">
            {collaborations.paragraphs.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </Reveal>
      </section>

      <section>
        <Reveal>
          <SectionTitle eyebrow="Network" title="Our Partner Institutions" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
              {[
                { id: 'exchange' as const, label: 'Student exchange' },
                { id: 'collaboration' as const, label: 'Faculty & research' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTab(option.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    tab === option.id ? 'bg-dark-blue text-white' : 'text-slate-600 hover:text-dark-blue'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="relative md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search institution or country..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-dark-blue focus:ring-4 focus:ring-dark-blue/10"
              />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {tab === 'exchange'
              ? 'Exchange of students for study, research, or training purposes.'
              : 'Faculty exchange, collaborative research, joint projects, or preparatory programs such as credit transfers, dual degrees or joint degrees.'}
          </p>
        </Reveal>

        <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
          {filteredPartners.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No institutions match your search.</p>
          ) : (
            <ul key={tab} className="divide-y divide-slate-100">
              {filteredPartners.map((item, index) => (
                <li
                  key={`${item.name}-${item.location}`}
                  style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                  className="rio-row flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-slate-50"
                >
                  <span className="flex min-w-0 items-center gap-3 text-sm font-medium text-slate-800">
                    <Handshake className="h-4 w-4 flex-shrink-0 text-accent-yellow" />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="flex-shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {item.location}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Reveal>
        <section className="flex flex-col gap-4 rounded-[2rem] bg-dark-blue p-8 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Learn more about RIO</h2>
            <p className="mt-2 text-slate-200">Meet the team and read the latest news on the official Riphah International Office website.</p>
          </div>
          <a
            href={RIO_WEBSITE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-2xl bg-accent-yellow px-6 py-3 text-sm font-bold text-dark-blue transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Visit riphah.edu.pk/rio
            <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      </Reveal>

      <style>{`
        @keyframes rio-row-in { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        .rio-row { opacity: 0; animation: rio-row-in 0.4s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) { .rio-row { opacity: 1; animation: none; } }
      `}</style>
    </div>
  );
}
