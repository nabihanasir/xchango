import { HelpCircle } from 'lucide-react';
import { rioFaqs } from '../../data/rioContent';
import SectionHeading from './SectionHeading';

/** Three-card FAQ block — quick answers before a student commits to applying. */
export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-light-color px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Good to Know" title="Frequently Asked Questions">
          Answers to what students ask most before starting an exchange application.
        </SectionHeading>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {rioFaqs.map(({ question, answer }) => (
            <article key={question} className="flex flex-col rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-dark-blue/5 text-dark-blue">
                <HelpCircle className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-base font-black text-dark-blue">{question}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
