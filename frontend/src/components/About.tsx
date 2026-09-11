import { Check } from 'lucide-react';
import { rioHighlights } from '../data/rioContent';
import SectionHeading from './landing/SectionHeading';

export default function About() {
  return (
    <section id="about" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="About RIO" title="A campus that reaches past its own borders">
          Riphah International Office exists to make study abroad a workable part of a Riphah degree — running
          the partnerships, the exchanges and the credit recognition that sit behind every placement.
        </SectionHeading>

        <div className="mx-auto mt-16 grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 shadow-soft">
            <img
              src="/bg.jpg"
              alt="Riphah International University campus building"
              className="h-full max-h-[26rem] w-full object-cover"
              loading="lazy"
            />
          </div>

          <div>
            <p className="text-base leading-8 text-slate-600">
              Through student and faculty exchange, joint research and cross-cultural learning, RIO supports the
              university’s international academic engagement — and gives students a named route into it.
            </p>

            <ul className="mt-8 space-y-4">
              {rioHighlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-yellow text-dark-blue">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <p className="text-sm font-medium leading-7 text-slate-600">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
