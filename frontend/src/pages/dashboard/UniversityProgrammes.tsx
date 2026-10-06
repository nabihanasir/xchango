import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, BookOpen, ChevronRight, Globe, Star, Search } from 'lucide-react';

import { COUNTRY_DATA } from '../../data/destinations';

export default function UniversityProgrammes() {
  const [searchQuery, setSearchQuery] = useState('');

  const query = searchQuery.trim().toLowerCase();
  const universityTiles = COUNTRY_DATA.flatMap((country) =>
    country.universities.map((university) => ({ country, university }))
  ).filter(
    ({ country, university }) =>
      !query ||
      country.name.toLowerCase().includes(query) ||
      university.name.toLowerCase().includes(query)
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-light-color/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-yellow/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-3xl font-bold text-dark-blue flex items-center gap-3 mb-2">
              <Globe className="h-8 w-8 text-accent-yellow" />
              University & Programmes
            </h2>
            <p className="text-body-text max-w-xl">
              Explore our partner universities. Select a university to open its page with programmes, fees and application details.
            </p>
          </div>

          <div className="w-full md:w-auto relative">
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

      <div className="bg-white rounded-3xl p-8 border border-light-color/50 shadow-sm">
        <p className="text-body-text leading-relaxed mb-4">
          The <strong className="text-dark-blue">Student Exchange Program at Riphah International University</strong> offers
          students a unique opportunity to study abroad at partner institutions, gaining global exposure and academic enrichment.
        </p>
        <p className="text-body-text leading-relaxed">
          This program enables students to immerse themselves in diverse cultures, engage with international academic
          environments, and build networks with peers and professionals worldwide.
        </p>
      </div>

      <div>
        <h3 className="mb-4 text-xl font-bold text-dark-blue">Partner Universities</h3>

        {universityTiles.length === 0 ? (
          <p className="rounded-2xl border border-light-color bg-white p-6 text-body-text">
            No universities match "{searchQuery}".
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {universityTiles.map(({ country, university }) => (
              <Link
                key={university.slug}
                to={`/dashboard/programmes/${university.slug}`}
                className="group overflow-hidden rounded-2xl border border-light-color/50 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={country.image}
                    alt={country.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-blue/90 via-dark-blue/40 to-transparent"></div>
                  <div className="absolute bottom-4 left-5 right-5">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
                      <span className="text-2xl">{country.flag}</span>
                      {country.name}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-white">{university.name}</h3>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-center gap-4 text-sm text-body-text">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {university.location}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-accent-yellow">
                      <Star className="h-4 w-4 fill-current" /> {university.rating}
                    </span>
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-bold text-dark-blue">
                      <BookOpen className="h-4 w-4" /> Available Programs
                    </p>
                    <ul className="space-y-1 text-sm text-body-text">
                      {university.programs.map((program) => (
                        <li key={program} className="truncate">{program}</li>
                      ))}
                    </ul>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-dark-blue">
                    View university
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
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
