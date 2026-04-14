import { BriefcaseBusiness, Compass, GraduationCap, Orbit } from 'lucide-react';

const features = [
  {
    icon: Orbit,
    title: 'Global Exposure',
    description: 'Build confidence through cross-cultural academic experiences and internationally connected learning pathways.',
  },
  {
    icon: GraduationCap,
    title: 'Industry-Relevant Curriculum',
    description: 'Explore emerging courses like AI, cybersecurity, robotics, mobile development, and data science.',
  },
  {
    icon: Compass,
    title: 'International Mobility',
    description: 'Move across partner opportunities with a clearer understanding of programs, destinations, and study options.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Career Opportunities',
    description: 'Develop broader academic and professional readiness for international careers and future postgraduate plans.',
  },
];

export default function Features() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.32em] text-yellow-default">Why It Matters</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-head-text sm:text-4xl">
            A modern gateway to international study and career growth
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-dark-blue to-dark-blue-light text-white">
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
