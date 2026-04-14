import { Globe, Handshake, PlaneTakeoff } from 'lucide-react';
import { rioHighlights } from '../data/rioContent';

const pillars = [
  {
    icon: Handshake,
    title: 'International Collaborations',
    description: 'RIO helps build academic links with overseas institutions to support joint programs, exchanges, and collaborative initiatives.',
  },
  {
    icon: PlaneTakeoff,
    title: 'Student Exchange Programs',
    description: 'Students can explore global pathways that strengthen mobility, cultural learning, and academic progression.',
  },
  {
    icon: Globe,
    title: 'Global Academic Exposure',
    description: 'Partner engagement opens access to diverse classrooms, emerging disciplines, and broader professional opportunities.',
  },
];

export default function About() {
  return (
    <section id="about" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-yellow-default">About Rio</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-head-text sm:text-4xl">
            RIO connects Riphah students with global learning ecosystems
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
            Based on the official RIO collaboration profile, Riphah International Office supports international academic
            engagement through student and faculty exchanges, joint research opportunities, and cross-cultural learning
            experiences that strengthen the university’s global outlook.
          </p>

          <div className="mt-8 space-y-4">
            {rioHighlights.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-default" />
                <p className="text-sm font-medium leading-6 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {pillars.map(({ icon: Icon, title, description }, index) => (
            <article
              key={title}
              className={`rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-soft ${
                index === 0 ? 'sm:col-span-2' : ''
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-yellow to-yellow-default text-dark-blue">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-black text-dark-blue">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
