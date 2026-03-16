import { useState } from 'react';
import { MapPin, School, BookOpen, ChevronRight, Globe, Star, Search } from 'lucide-react';

// Required static data based on requirements
const COUNTRY_DATA = [
  {
    id: 'south-korea',
    name: 'South Korea',
    flag: '🇰🇷',
    image: 'https://images.unsplash.com/photo-1546874177-9e664107314e?q=80&w=800&auto=format&fit=crop',
    universities: [
      {
        name: 'Kyungdong University Global',
        programs: ['BBA in International Business', 'BSc in Hotel Management', 'BSc in Smart Computing'],
        rating: 4.8,
        location: 'Goseong',
      }
    ]
  },
  {
    id: 'malaysia',
    name: 'Malaysia',
    flag: '🇲🇾',
    image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f0a?q=80&w=800&auto=format&fit=crop',
    universities: [
      {
        name: 'Universiti Telekom Sdn Bhd (Multimedia University)',
        programs: ['Bachelor of Computer Science', 'Bachelor of Engineering', 'Bachelor of Creative Multimedia'],
        rating: 4.7,
        location: 'Cyberjaya',
      }
    ]
  },
  {
    id: 'turkiye',
    name: 'Turkiye',
    flag: '🇹🇷',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=800&auto=format&fit=crop',
    universities: [
      {
        name: 'Istanbul Aydin University',
        programs: ['BSc in Software Engineering', 'BA in Business Administration', 'BSc in Architecture'],
        rating: 4.6,
        location: 'Istanbul',
      }
    ]
  }
];

export default function UniversityProgrammes() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const activeCountryData = COUNTRY_DATA.find(c => c.id === selectedCountry);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Section */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-light-color/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-yellow/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-3xl font-bold text-dark-blue flex items-center gap-3 mb-2">
              <Globe className="h-8 w-8 text-accent-yellow" />
              University & Programmes
            </h2>
            <p className="text-body-text max-w-xl">
              Explore leading universities across our top destinations. Select a country to view available institutions and programs.
            </p>
          </div>
          
          <div className="w-full md:w-auto relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search countries..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-80 pl-10 pr-4 py-3 bg-light-color/30 border border-light-color rounded-xl focus:outline-none focus:ring-2 focus:ring-dark-blue/50 transition-all text-body-text"
            />
          </div>
        </div>
      </div>

      {/* Programme Intro */}
      {!selectedCountry && (
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
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Countries List (Sidebar or Top depending on selected state) */}
        <div className={`transition-all duration-500 ${selectedCountry ? 'lg:col-span-4 space-y-4' : 'lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6'}`}>
          {!selectedCountry && (
            <div className="lg:col-span-12 mb-2">
              <h3 className="text-xl font-bold text-dark-blue">Available Destinations</h3>
            </div>
          )}
          
          {COUNTRY_DATA.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((country) => (
            <div 
              key={country.id}
              onClick={() => setSelectedCountry(selectedCountry === country.id ? null : country.id)}
              className={`cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 border ${
                selectedCountry === country.id 
                  ? 'border-accent-yellow shadow-lg shadow-accent-yellow/10 ring-2 ring-accent-yellow/50 bg-white' 
                  : 'border-light-color/50 bg-white hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              <div className="relative h-52 md:h-64 overflow-hidden group">
                <img 
                  src={country.image} 
                  alt={country.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-blue/90 via-dark-blue/40 to-transparent"></div>
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                  <h3 className="text-3xl font-bold text-white flex items-center gap-3">
                    <span className="text-4xl">{country.flag}</span>
                    {country.name}
                  </h3>
                  {selectedCountry !== country.id && (
                    <ChevronRight className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 duration-300" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Country Details */}
        {selectedCountry && activeCountryData && (
          <div className="lg:col-span-8 animate-fade-in-up">
            <div className="bg-white rounded-3xl p-8 border border-light-color/50 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-dark-blue via-accent-yellow to-dark-blue"></div>
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-dark-blue mb-2 flex items-center gap-3">
                  Universities in {activeCountryData.name} {activeCountryData.flag}
                </h3>
                <p className="text-body-text">
                  Discover top-ranked institutions offering exceptional educational experiences.
                </p>
              </div>

              <div className="space-y-6">
                {activeCountryData.universities.map((uni, index) => (
                  <div key={index} className="bg-light-color/10 border border-light-color rounded-2xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-xl font-bold text-dark-blue flex items-center gap-2">
                              <School className="h-5 w-5 text-accent-yellow" />
                              {uni.name}
                            </h4>
                            <div className="flex items-center gap-4 mt-2 text-sm text-body-text">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" /> {uni.location}
                              </span>
                              <span className="flex items-center gap-1 text-accent-yellow font-medium">
                                <Star className="h-4 w-4 fill-current" /> {uni.rating}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 border-t border-light-color/50 pt-6">
                          <h5 className="font-bold text-dark-blue mb-4 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" /> Available Programs
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {uni.programs.map((prog, pIndex) => (
                              <div key={pIndex} className="bg-white px-4 py-3 rounded-xl border border-light-color/50 text-sm font-medium text-body-text flex items-center justify-between group cursor-pointer hover:border-dark-blue/30 hover:shadow-sm transition-all">
                                <span className="truncate mr-2">{prog}</span>
                                <ChevronRight className="h-4 w-4 text-light-color group-hover:text-dark-blue transition-colors flex-shrink-0" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
      
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
