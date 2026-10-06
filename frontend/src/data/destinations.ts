// Partner destinations shown on the programmes page and used for profile preference options.
export const COUNTRY_DATA = [
  {
    id: 'south-korea',
    name: 'South Korea',
    flag: '🇰🇷',
    image: 'https://images.unsplash.com/photo-1546874177-9e664107314e?q=80&w=800&auto=format&fit=crop',
    universities: [
      {
        slug: 'kyungdong-university-global',
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
    image: 'https://cdn.britannica.com/49/102749-050-B4874C95/Kuala-Lumpur-Malaysia.jpg?w=300',
    universities: [
      {
        slug: 'multimedia-university',
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
        slug: 'istanbul-aydin-university',
        name: 'Istanbul Aydin University',
        programs: ['BSc in Software Engineering', 'BA in Business Administration', 'BSc in Architecture'],
        rating: 4.6,
        location: 'Istanbul',
      }
    ]
  }
];

export const DESTINATION_COUNTRIES = COUNTRY_DATA.map((country) => country.name);

// Programmes offered by the partner universities in the given countries (all countries when none are given).
export const getProgramsForCountries = (countries: string[]) => {
  const selected = countries.length ? COUNTRY_DATA.filter((country) => countries.includes(country.name)) : COUNTRY_DATA;
  return [...new Set(selected.flatMap((country) => country.universities.flatMap((university) => university.programs)))];
};
