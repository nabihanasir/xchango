import { partnerUniversities } from '../../data/rioContent';

/**
 * Large-numeral statistics band.
 *
 * Every figure is derived from `partnerUniversities` at render time rather than
 * hard-coded, so the band can never drift out of step with the catalogue —
 * add a partner to the data file and these counts follow.
 */
const uniqueCount = (values: string[]) => new Set(values.map((v) => v.toLowerCase())).size;

export default function StatsBand() {
  const stats = [
    { value: partnerUniversities.length, label: 'Partner Universities' },
    { value: uniqueCount(partnerUniversities.map((p) => p.country)), label: 'Partner Countries' },
    { value: uniqueCount(partnerUniversities.flatMap((p) => p.programs)), label: 'Degree Programmes' },
    { value: uniqueCount(partnerUniversities.flatMap((p) => p.courses)), label: 'Specialisation Areas' },
  ];

  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`px-2 text-center sm:px-6 ${
                index === 0 ? '' : 'sm:border-l sm:border-slate-200'
              } ${index === 2 ? 'lg:border-l' : ''} ${index % 2 === 0 ? 'border-l-0' : ''}`}
            >
              <dd className="text-4xl font-black tracking-tight text-dark-blue sm:text-5xl">
                {stat.value}
              </dd>
              <dt className="mt-3 text-xs font-bold uppercase leading-5 tracking-[0.18em] text-slate-500">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
