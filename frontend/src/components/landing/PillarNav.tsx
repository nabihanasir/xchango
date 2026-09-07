import { BookOpenCheck, Globe2, PlaneTakeoff } from 'lucide-react';

const pillars = [
  {
    icon: BookOpenCheck,
    title: 'Equivalency and Recognition',
    description: 'How credits earned abroad are mapped back onto your Riphah degree.',
    href: '#equivalency',
  },
  {
    icon: PlaneTakeoff,
    title: 'Student Exchange Programs',
    description: 'Partner universities, degree programmes and the pathways between them.',
    href: '#exchange',
  },
  {
    icon: Globe2,
    title: 'Global Education Vision',
    description: 'The principles guiding Riphah’s international academic engagement.',
    href: '#vision',
  },
];

/** Three jump-cards that preview — and link to — the page's main content blocks. */
export default function PillarNav() {
  return (
    <section className="bg-light-color px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
        {pillars.map(({ icon: Icon, title, description, href }) => (
          <a
            key={href}
            href={href}
            className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-dark-blue/25 hover:shadow-xl hover:shadow-slate-200/70"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-blue text-accent-yellow transition group-hover:scale-105">
              <Icon className="h-6 w-6" />
            </span>
            <h3 className="mt-6 text-lg font-black text-dark-blue">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
            <span className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-yellow-default">
              Read more
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
