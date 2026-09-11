import SectionHeading from './SectionHeading';

const principles = [
  {
    number: '01',
    title: 'Academic Advancement',
    body: 'Extend the curriculum beyond a single campus — joint programmes, shared research and access to disciplines Riphah does not yet teach in depth.',
  },
  {
    number: '02',
    title: 'Economic Opportunity',
    body: 'Graduates who have studied across two systems enter the job market with credentials and experience that read clearly to international employers.',
  },
  {
    number: '03',
    title: 'Social and Cultural Exchange',
    body: 'Mobility works in both directions. Students who study abroad return with perspective, and visiting students broaden the classroom they join.',
  },
  {
    number: '04',
    title: 'Institutional Partnership',
    body: 'Every exchange rests on a standing agreement between universities — recognised credit, aligned calendars and a named advisor on each side.',
  },
];

export default function GlobalVision() {
  return (
    <section id="vision" className="scroll-mt-24 bg-light-color px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Direction" title="Global Education Vision">
          Riphah’s international engagement is guided by four commitments that shape which partnerships are
          formed and how students move through them.
        </SectionHeading>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {principles.map(({ number, title, body }) => (
            <article
              key={number}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -top-6 text-[7rem] font-black leading-none text-slate-100 transition group-hover:text-accent-yellow/20"
              >
                {number}
              </span>
              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-default">{number}</p>
                <h3 className="mt-4 text-xl font-black text-dark-blue">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
