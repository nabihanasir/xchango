import { CalendarClock, FileText, Languages, Wallet } from 'lucide-react';
import SectionHeading from './SectionHeading';

const tips = [
  {
    icon: CalendarClock,
    title: 'Start a term ahead',
    body: 'Placements, transcript review and visa paperwork all take time. Begin the semester before you intend to travel.',
  },
  {
    icon: FileText,
    title: 'Keep documents current',
    body: 'An up-to-date transcript and complete profile let an advisor assess your equivalency request without a second round of questions.',
  },
  {
    icon: Languages,
    title: 'Check the language of instruction',
    body: 'Partner programmes differ. Confirm the teaching language and any proficiency requirement before you commit to a destination.',
  },
  {
    icon: Wallet,
    title: 'Plan the full cost',
    body: 'Account for tuition, housing, travel and insurance together — not tuition alone — when comparing destinations.',
  },
];

export default function Tips() {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Before You Apply" title="Tips">
          A few things worth settling early — they save the most time later.
        </SectionHeading>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {tips.map(({ icon: Icon, title, body }, index) => (
            <article
              key={title}
              className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft transition duration-300 hover:-translate-y-1"
            >
              <span aria-hidden="true" className="block h-1.5 w-full bg-accent-yellow" />
              <div className="p-7">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dark-blue text-accent-yellow">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-300">
                    Tip 0{index + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-base font-black text-dark-blue">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
