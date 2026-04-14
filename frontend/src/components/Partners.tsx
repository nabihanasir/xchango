import { ChevronDown, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { partnerUniversities } from '../data/rioContent';

export default function Partners() {
  const [expandedId, setExpandedId] = useState<string | null>(partnerUniversities[0]?.id ?? null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredPartners = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return partnerUniversities;
    }

    return partnerUniversities.filter((partner) =>
      [partner.name, partner.country, ...partner.programs, ...partner.courses].some((item) =>
        item.toLowerCase().includes(value),
      ),
    );
  }, [query]);

  const selectedPartner = partnerUniversities.find((partner) => partner.id === selectedId) ?? null;

  return (
    <section id="partners" className="bg-slate-950/[0.02] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.32em] text-yellow-default">Partner Universities</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-head-text sm:text-4xl">
              Explore international partner pathways curated for Riphah students
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              These featured universities reflect the partner and program data provided for the collaboration experience,
              with expandable course lists and quick discovery tools for students exploring the best-fit pathway.
            </p>
          </div>

          <label className="relative block w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by university, country, program, or course"
              className="w-full rounded-full border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-medium text-slate-700 shadow-soft outline-none transition focus:border-dark-blue"
            />
          </label>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-3">
          {filteredPartners.map((partner) => {
            const expanded = expandedId === partner.id;

            return (
              <article
                key={partner.id}
                className="group flex h-full flex-col rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">{partner.flag}</p>
                    <h3 className="mt-3 text-2xl font-black text-dark-blue">{partner.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-yellow-default">{partner.country}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-dark-blue">
                    {partner.programs.length} Program{partner.programs.length > 1 ? 's' : ''}
                  </div>
                </div>

                <p className="mt-5 text-sm leading-7 text-slate-600">{partner.description}</p>

                <div className="mt-6">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">Programs</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {partner.programs.map((program) => (
                      <span
                        key={program}
                        className="rounded-full bg-dark-blue/5 px-3 py-2 text-xs font-bold text-dark-blue"
                      >
                        {program}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-3xl bg-slate-50 p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : partner.id)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div>
                      <p className="text-sm font-black text-dark-blue">Featured Courses</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">Tap to expand or collapse the course list</p>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-dark-blue transition ${expanded ? 'rotate-180' : ''}`} />
                  </button>

                  {expanded ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {partner.courses.map((course) => (
                        <span key={course} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                          {course}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex items-center justify-between rounded-3xl border border-slate-100 bg-gradient-to-r from-accent-yellow/20 to-white px-4 py-3">
                  <p className="max-w-[14rem] text-sm font-semibold text-slate-700">{partner.highlight}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedId(partner.id)}
                    className="rounded-full bg-dark-blue px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-dark-blue-light"
                  >
                    View Details
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {!filteredPartners.length ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
            <p className="text-lg font-bold text-dark-blue">No partner matched that search.</p>
            <p className="mt-2 text-sm text-slate-500">Try searching by country, program title, or a course like AI or Data Mining.</p>
          </div>
        ) : null}
      </div>

      {selectedPartner ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-950/20 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-default">{selectedPartner.country}</p>
                <h3 className="mt-3 text-3xl font-black text-dark-blue">{selectedPartner.name}</h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">{selectedPartner.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-dark-blue"
                aria-label="Close details modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-[1.75rem] bg-slate-50 p-5">
                <p className="text-sm font-black uppercase tracking-[0.28em] text-slate-400">Programs</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedPartner.programs.map((program) => (
                    <span key={program} className="rounded-full bg-dark-blue px-3 py-2 text-xs font-bold text-white">
                      {program}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-slate-50 p-5">
                <p className="text-sm font-black uppercase tracking-[0.28em] text-slate-400">Courses</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedPartner.courses.map((course) => (
                    <span key={course} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                      {course}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
