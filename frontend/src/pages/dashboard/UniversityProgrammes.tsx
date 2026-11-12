import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, BookOpen, ChevronRight, Globe, Search } from 'lucide-react';

import CountryFlag from '../../components/CountryFlag';
import { useCatalog } from '../../hooks/useCatalog';

const FALLBACK_BACKGROUND = 'bg-dark-blue';

export default function UniversityProgrammes() {
  const [searchQuery, setSearchQuery] = useState('');
  const { universities, loading, error } = useCatalog();

  const query = searchQuery.trim().toLowerCase();
  const universityTiles = universities
    .filter((university) => university.slug)
    .filter(
      (university) =>
        !query ||
        university.countryId?.name.toLowerCase().includes(query) ||
        university.name.toLowerCase().includes(query)
    );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-light-color/50">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-dark-blue flex items-center gap-3 mb-2">
              <Globe className="h-8 w-8 text-accent-yellow" />
              University & Programmes
            </h2>
            <p className="text-body-text max-w-3xl text-sm leading-relaxed">
              The <strong className="text-dark-blue">Student Exchange Program at Riphah International University</strong> lets you
              study abroad at partner institutions, build global exposure and academic experience, and connect with peers and
              professionals worldwide. Select a university to see its programmes, fees and application details.
            </p>
          </div>

          <div className="w-full md:w-auto relative flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search countries or universities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-80 pl-10 pr-4 py-3 bg-light-color/30 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-dark-blue/50 transition-all text-body-text"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-xl font-bold text-dark-blue">Partner Universities</h3>

        {loading ? (
          <p className="rounded-2xl border border-light-color bg-white p-6 text-body-text">Loading universities...</p>
        ) : error ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 p-6 font-semibold text-red-600">{error}</p>
        ) : universityTiles.length === 0 ? (
          <p className="rounded-2xl border border-light-color bg-white p-6 text-body-text">
            {query ? `No universities match "${searchQuery}".` : 'No partner universities have been published yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {universityTiles.map((university) => {
              const country = university.countryId;
              const image = university.image || country?.image;
              const programmes = (university.programmes ?? []).slice(0, 3);

              return (
                <Link
                  key={university._id}
                  to={`/dashboard/programmes/${university.slug}`}
                  className="group overflow-hidden rounded-2xl border border-light-color/50 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className={`relative h-52 overflow-hidden ${FALLBACK_BACKGROUND}`}>
                    {image ? (
                      <img
                        src={image}
                        alt={country?.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-blue/90 via-dark-blue/40 to-transparent"></div>
                    <div className="absolute bottom-4 left-5 right-5">
                      <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
                        <CountryFlag code={country?.code} emoji={country?.flag} />
                        {country?.name}
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-white">{university.name}</h3>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    {university.city ? (
                      <div className="flex items-center gap-4 text-sm text-body-text">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" /> {university.city}
                        </span>
                      </div>
                    ) : null}
                    {programmes.length ? (
                      <div>
                        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-dark-blue">
                          <BookOpen className="h-4 w-4" /> Available Programs
                        </p>
                        <ul className="space-y-1 text-sm text-body-text">
                          {programmes.map((programme) => (
                            <li key={programme.name} className="truncate">{programme.name}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-dark-blue">
                      View university
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
