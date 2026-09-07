import { ArrowRight, BadgeCheck, FileCheck2, Scale } from 'lucide-react';
import SectionHeading from './SectionHeading';

const points = [
  {
    icon: Scale,
    title: 'Credit transfer',
    body: 'Courses completed at a partner university are weighed against their Riphah counterparts so study abroad counts toward your degree.',
  },
  {
    icon: FileCheck2,
    title: 'Transcript review',
    body: 'Upload a transcript and an advisor reviews each course against the home catalogue, recording the decision on your record.',
  },
  {
    icon: BadgeCheck,
    title: 'Formal recognition',
    body: 'Approved equivalencies are issued as a documented outcome you can carry into further study or employment.',
  },
];

/** Sample mapping shown in the illustration — mirrors the catalogue in rioContent. */
const sampleMappings = [
  { from: 'Machine Learning', to: 'Artificial Intelligence', status: 'Approved' },
  { from: 'Computer Vision', to: 'Digital Image Processing', status: 'Approved' },
  { from: 'Ethical Hacking', to: 'Information Security', status: 'Under review' },
];

export default function Equivalency() {
  return (
    <section id="equivalency" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Academic Standing" title="Equivalency and Recognition">
          Studying abroad should move your degree forward, not pause it. Riphah maps partner coursework back
          onto its own programmes so the credit you earn overseas is recognised at home.
        </SectionHeading>

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-5">
            {points.map(({ icon: Icon, title, body }) => (
              <article key={title} className="flex gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-yellow/15 text-dark-blue">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-dark-blue">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
                </div>
              </article>
            ))}
          </div>

          {/* Illustration: what a mapped transcript actually looks like */}
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-dark-blue p-8 shadow-[0_25px_80px_-30px_rgba(9,6,56,0.6)] lg:p-10">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-accent-yellow">
              Course mapping
            </p>
            <h3 className="mt-3 text-xl font-black text-white">Partner course to Riphah credit</h3>

            <div className="mt-8 space-y-4">
              {sampleMappings.map((row) => (
                <div key={row.from} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <p className="flex-1 text-sm font-bold text-white">{row.from}</p>
                    <ArrowRight className="hidden h-4 w-4 shrink-0 text-accent-yellow sm:block" />
                    <p className="flex-1 text-sm font-bold text-white/70">{row.to}</p>
                  </div>
                  <span
                    className={`mt-4 inline-block rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                      row.status === 'Approved'
                        ? 'bg-emerald-400/15 text-emerald-300'
                        : 'bg-amber-400/15 text-amber-300'
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-7 text-xs leading-6 text-white/45">
              Illustrative example. Every equivalency is decided by an academic advisor against the live course
              catalogue.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
