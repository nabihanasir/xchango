/**
 * Sample (dummy) content for the university detail pages. None of these figures are official:
 * replace them with real data when it is available.
 */

export type FacilityIcon = 'library' | 'lab' | 'gym' | 'food' | 'wifi' | 'health' | 'transport' | 'community';

export interface UniversityFact {
  label: string;
  value: string;
}

export interface UniversityProgramme {
  name: string;
  level: string;
  duration: string;
  language: string;
  credits: string;
  description: string;
}

export interface IntakeMilestone {
  title: string;
  date: string;
  description: string;
  owner: 'Student' | 'Riphah RIO' | 'Host university' | 'Embassy / Immigration';
}

export interface UniversityIntake {
  id: string;
  label: string;
  season: 'Spring' | 'Fall';
  startDate: string;
  applicationDeadline: string;
  seatsTotal: number;
  seatsTaken: number;
  milestones: IntakeMilestone[];
}

export interface UniversityCost {
  label: string;
  amount: string;
  note: string;
}

export interface UniversityFacility {
  title: string;
  description: string;
  icon: FacilityIcon;
}

export interface UniversityFaq {
  question: string;
  answer: string;
}

export interface UniversityProfile {
  slug: string;
  name: string;
  shortName: string;
  country: string;
  flag: string;
  city: string;
  region: string;
  tagline: string;
  gradient: string;
  rating: number;
  about: string[];
  facts: UniversityFact[];
  highlights: string[];
  programmes: UniversityProgramme[];
  intakes: UniversityIntake[];
  costs: UniversityCost[];
  facilities: UniversityFacility[];
  accommodation: UniversityFact[];
  requirements: string[];
  scholarships: UniversityCost[];
  visa: { title: string; summary: string; steps: string[] };
  livingTips: UniversityFact[];
  faqs: UniversityFaq[];
  contact: { email: string; phone: string; address: string; website: string };
}

const DAY = 24 * 60 * 60 * 1000;

const shiftDate = (isoDate: string, days: number) =>
  new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10);

interface TimelineContext {
  shortName: string;
  city: string;
  visaTitle: string;
  visaOwner: IntakeMilestone['owner'];
  orientation: string;
}

/** Every intake follows the same stages, dated relative to the first day of classes. */
const buildMilestones = (startDate: string, context: TimelineContext): IntakeMilestone[] => [
  {
    title: 'Applications open',
    date: shiftDate(startDate, -170),
    description: `The exchange portal opens for ${context.shortName}. Check the programme list and your eligibility.`,
    owner: 'Riphah RIO',
  },
  {
    title: 'Internal nomination deadline',
    date: shiftDate(startDate, -120),
    description: 'Submit your application, transcript and statement of purpose to the International Office.',
    owner: 'Student',
  },
  {
    title: 'Interviews and shortlisting',
    date: shiftDate(startDate, -100),
    description: 'Advisors interview applicants and publish the shortlist. Course equivalency requests unlock afterwards.',
    owner: 'Riphah RIO',
  },
  {
    title: 'Host university review',
    date: shiftDate(startDate, -75),
    description: `${context.shortName} reviews nominated students and confirms placements.`,
    owner: 'Host university',
  },
  {
    title: 'Offer letter issued',
    date: shiftDate(startDate, -55),
    description: 'Your official acceptance letter arrives. Upload it to your application.',
    owner: 'Host university',
  },
  {
    title: context.visaTitle,
    date: shiftDate(startDate, -40),
    description: 'Submit your passport, offer letter, financial proof and photographs, then track the status in the Visa section.',
    owner: context.visaOwner,
  },
  {
    title: `Travel to ${context.city}`,
    date: shiftDate(startDate, -7),
    description: 'Book flights once your visa is approved. Mark your arrival in the portal when you land.',
    owner: 'Student',
  },
  {
    title: 'Orientation week',
    date: shiftDate(startDate, -3),
    description: context.orientation,
    owner: 'Host university',
  },
  {
    title: 'Classes begin',
    date: startDate,
    description: 'First day of the semester. Confirm your course registration with your instructors.',
    owner: 'Host university',
  },
  {
    title: 'Mid-semester assessments',
    date: shiftDate(startDate, 60),
    description: 'Mid-term examinations and project checkpoints.',
    owner: 'Host university',
  },
  {
    title: 'Final examinations',
    date: shiftDate(startDate, 108),
    description: 'Final exams and submissions. Results are published to your Riphah profile afterwards.',
    owner: 'Host university',
  },
  {
    title: 'Exchange semester ends',
    date: shiftDate(startDate, 120),
    description: 'Return home, complete the exchange feedback survey and request transcript transfer.',
    owner: 'Student',
  },
];

const buildIntake = (
  season: UniversityIntake['season'],
  year: number,
  startDate: string,
  seatsTotal: number,
  seatsTaken: number,
  context: TimelineContext
): UniversityIntake => ({
  id: `${season.toLowerCase()}-${year}`,
  label: `${season} ${year}`,
  season,
  startDate,
  applicationDeadline: shiftDate(startDate, -120),
  seatsTotal,
  seatsTaken,
  milestones: buildMilestones(startDate, context),
});

const kduContext: TimelineContext = {
  shortName: 'KDU Global',
  city: 'Goseong',
  visaTitle: 'D-2 student visa application',
  visaOwner: 'Embassy / Immigration',
  orientation: 'Campus tour, buddy matching, Korean language survival class and alien registration help.',
};

const mmuContext: TimelineContext = {
  shortName: 'MMU',
  city: 'Cyberjaya',
  visaTitle: 'Student Pass (EMGS) application',
  visaOwner: 'Embassy / Immigration',
  orientation: 'Welcome briefing, medical screening, student card collection and a Cyberjaya city walk.',
};

const iauContext: TimelineContext = {
  shortName: 'IAU',
  city: 'Istanbul',
  visaTitle: 'Student visa and residence permit',
  visaOwner: 'Embassy / Immigration',
  orientation: 'Orientation sessions, Turkish culture workshop, metro card setup and residence permit appointment.',
};

export const universityProfiles: UniversityProfile[] = [
  {
    slug: 'kyungdong-university-global',
    name: 'Kyungdong University Global',
    shortName: 'KDU Global',
    country: 'South Korea',
    flag: '🇰🇷',
    city: 'Goseong',
    region: 'Gangwon Province',
    tagline: 'A small, close-knit campus between the mountains and the East Sea.',
    gradient: 'from-[#0b1e5b] via-[#1d3a8a] to-[#0e7490]',
    rating: 4.8,
    about: [
      'KDU Global is the international campus of Kyungdong University, set on the east coast of South Korea. Classes are small, instructors are approachable and most courses for exchange students are taught in English.',
      'Riphah exchange students join a mixed cohort of Korean and international students. The campus is compact and walkable, with dormitories, cafeterias and labs within a few minutes of each other.',
    ],
    facts: [
      { label: 'Founded', value: '1994' },
      { label: 'Students', value: '~7,500' },
      { label: 'International students', value: '28%' },
      { label: 'Language of instruction', value: 'English / Korean' },
      { label: 'Campus setting', value: 'Coastal, 40 ha' },
      { label: 'Exchange seats per year', value: '30' },
    ],
    highlights: [
      'English-taught courses in computing, business and hospitality',
      'Free Korean language classes for exchange students',
      'Dormitory placement guaranteed for exchange students',
      'Buddy programme with local students',
    ],
    programmes: [
      {
        name: 'BSc in Smart Computing',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Programming, data structures, networks, databases and applied AI with a project-based capstone.',
      },
      {
        name: 'BBA in International Business',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Global trade, marketing, finance and cross-cultural management with Korean industry case studies.',
      },
      {
        name: 'BSc in Hotel Management',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Hospitality operations, tourism, events and service design, including an optional resort placement.',
      },
      {
        name: 'BSc in Cybersecurity and IoT',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Cryptography, secure systems, embedded devices and connected-device platforms.',
      },
    ],
    intakes: [
      buildIntake('Fall', 2026, '2026-09-01', 30, 30, kduContext),
      buildIntake('Spring', 2027, '2027-03-02', 30, 18, kduContext),
      buildIntake('Fall', 2027, '2027-09-01', 30, 4, kduContext),
    ],
    costs: [
      { label: 'Tuition', amount: 'Waived', note: 'Exchange students pay tuition at Riphah only.' },
      { label: 'Dormitory (per semester)', amount: '~USD 900', note: 'Shared twin room, utilities included.' },
      { label: 'Meals (per month)', amount: '~USD 180', note: 'Campus cafeteria, three meals a day.' },
      { label: 'Health insurance (per semester)', amount: '~USD 120', note: 'Mandatory for all international students.' },
      { label: 'Local transport (per month)', amount: '~USD 35', note: 'Bus pass for Goseong and nearby towns.' },
      { label: 'Visa and registration', amount: '~USD 90', note: 'D-2 visa fee and alien registration card.' },
    ],
    facilities: [
      { title: 'Central library', description: '24-hour study floors, group rooms and English journals.', icon: 'library' },
      { title: 'Computing labs', description: 'GPU lab, IoT workshop and open-access workstations.', icon: 'lab' },
      { title: 'Sports centre', description: 'Gym, swimming pool and a seaside running track.', icon: 'gym' },
      { title: 'Cafeterias', description: 'Korean and international menus with halal-friendly options on request.', icon: 'food' },
      { title: 'Campus Wi-Fi', description: 'Gigabit campus network, including dormitories.', icon: 'wifi' },
      { title: 'Health clinic', description: 'On-campus clinic with English-speaking staff.', icon: 'health' },
      { title: 'Shuttle bus', description: 'Free shuttle between campus, Goseong town and the bus terminal.', icon: 'transport' },
      { title: 'Student clubs', description: 'Over 60 clubs from taekwondo to K-pop dance and robotics.', icon: 'community' },
    ],
    accommodation: [
      { label: 'Type', value: 'University dormitory, shared twin room' },
      { label: 'Distance to classes', value: '5 minutes on foot' },
      { label: 'Includes', value: 'Bed, desk, wardrobe, heating, laundry room' },
      { label: 'Kitchen', value: 'Shared kitchen on each floor' },
      { label: 'Curfew', value: 'None, 24-hour access with student card' },
    ],
    requirements: [
      'Enrolled Riphah student with a minimum CGPA of 2.7',
      'Completed at least two semesters before departure',
      'Valid passport with 12 months remaining validity',
      'English proficiency: IELTS 5.5 or Riphah English certificate',
      'Proof of funds and signed parental consent',
      'No active disciplinary action',
    ],
    scholarships: [
      { label: 'KDU Global Exchange Grant', amount: 'USD 500', note: 'One-time grant for the first 10 confirmed students.' },
      { label: 'Riphah Merit Travel Support', amount: 'Up to 50% airfare', note: 'For students with CGPA above 3.5.' },
    ],
    visa: {
      title: 'D-2 student visa',
      summary: 'Pakistani exchange students apply for a D-2 visa at the Korean embassy in Islamabad using the KDU Global offer letter.',
      steps: [
        'Receive the offer letter and certificate of admission from KDU Global',
        'Prepare passport, photographs, bank statement and academic records',
        'Submit the application at the Korean embassy, Islamabad',
        'Attend the interview if requested',
        'Collect the visa, then register for an alien registration card within 90 days of arrival',
      ],
    },
    livingTips: [
      { label: 'Climate', value: 'Four seasons. Cold, dry winters (-5 to 5 C) and warm summers.' },
      { label: 'Currency', value: 'South Korean won (KRW)' },
      { label: 'Getting there', value: 'Fly to Incheon, then bus to Goseong (about 3.5 hours).' },
      { label: 'Food', value: 'Halal food is limited. Carry basics and use the dorm kitchen.' },
      { label: 'Prayer space', value: 'Quiet room available at the student centre.' },
    ],
    faqs: [
      { question: 'Do I need to speak Korean?', answer: 'No. Exchange courses are taught in English, and free Korean classes are available for daily life.' },
      { question: 'Can I transfer the credits back to Riphah?', answer: 'Yes. Submit a course equivalency request after your interview, and your advisor will approve the mapping before you leave.' },
      { question: 'Is the dormitory compulsory?', answer: 'It is recommended for exchange students, but you can choose to arrange your own housing.' },
      { question: 'Can I work part-time?', answer: 'D-2 visa holders may work limited hours after approval from immigration, but exchange students are advised to focus on study.' },
    ],
    contact: {
      email: 'exchange@kdu-global.example',
      phone: '+82 33 000 0000',
      address: 'International Office, KDU Global, Goseong, Gangwon Province, South Korea',
      website: 'https://www.kduglobal.example',
    },
  },
  {
    slug: 'multimedia-university',
    name: 'Multimedia University',
    shortName: 'MMU',
    country: 'Malaysia',
    flag: '🇲🇾',
    city: 'Cyberjaya',
    region: 'Selangor',
    tagline: 'Malaysia\'s technology hub: study computing and media next to the country\'s biggest tech companies.',
    gradient: 'from-[#2b0a5e] via-[#5b21b6] to-[#be185d]',
    rating: 4.7,
    about: [
      'Multimedia University sits in Cyberjaya, Malaysia\'s planned technology city, a short ride from Kuala Lumpur. Its programmes are built with industry, and many lecturers work with companies on the same campus.',
      'Exchange students take English-taught courses alongside Malaysian and international classmates. Malaysia is a Muslim-majority country, so halal food and prayer facilities are easy to find.',
    ],
    facts: [
      { label: 'Founded', value: '1996' },
      { label: 'Students', value: '~20,000' },
      { label: 'International students', value: '18%' },
      { label: 'Language of instruction', value: 'English' },
      { label: 'Campus setting', value: 'Tech city, 100 ha' },
      { label: 'Exchange seats per year', value: '40' },
    ],
    highlights: [
      'All exchange courses taught in English',
      'Halal food and prayer rooms across campus',
      'Industry projects with Cyberjaya technology companies',
      'Twenty minutes from Kuala Lumpur International Airport',
    ],
    programmes: [
      {
        name: 'Bachelor of Computer Science',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Algorithms, operating systems, databases, machine learning and mobile development.',
      },
      {
        name: 'Bachelor of Engineering (Electronics)',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Embedded systems, communications, signal processing and robotics laboratories.',
      },
      {
        name: 'Bachelor of Creative Multimedia',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Animation, game design, digital media production and interaction design studios.',
      },
      {
        name: 'Bachelor of IT (Security Technology)',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Ethical hacking, network defence, digital forensics and blockchain fundamentals.',
      },
    ],
    intakes: [
      buildIntake('Fall', 2026, '2026-10-12', 40, 40, mmuContext),
      buildIntake('Spring', 2027, '2027-02-22', 40, 26, mmuContext),
      buildIntake('Fall', 2027, '2027-10-11', 40, 6, mmuContext),
    ],
    costs: [
      { label: 'Tuition', amount: 'Waived', note: 'Exchange students pay tuition at Riphah only.' },
      { label: 'Hostel (per semester)', amount: '~USD 550', note: 'Shared room with air conditioning.' },
      { label: 'Meals (per month)', amount: '~USD 150', note: 'Campus food court and nearby eateries.' },
      { label: 'Health insurance (per semester)', amount: '~USD 60', note: 'Required for the Student Pass.' },
      { label: 'Local transport (per month)', amount: '~USD 25', note: 'Campus shuttle plus ride-hailing and rail.' },
      { label: 'Visa and EMGS fees', amount: '~USD 140', note: 'Student Pass processing and medical screening.' },
    ],
    facilities: [
      { title: 'Library and learning commons', description: 'Open-plan study areas, 3D printing and quiet rooms.', icon: 'library' },
      { title: 'Innovation labs', description: 'AI, cybersecurity, robotics and media production studios.', icon: 'lab' },
      { title: 'Sports complex', description: 'Gym, football pitch, badminton and swimming facilities.', icon: 'gym' },
      { title: 'Food court', description: 'Wide halal selection, from Malay to Middle Eastern dishes.', icon: 'food' },
      { title: 'Campus Wi-Fi', description: 'Campus-wide Wi-Fi and fibre in every hostel block.', icon: 'wifi' },
      { title: 'Medical centre', description: 'Clinic with doctors on call and an ambulance service.', icon: 'health' },
      { title: 'Shuttle and rail access', description: 'Free campus shuttle and a bus link to the nearest train station.', icon: 'transport' },
      { title: 'Student societies', description: 'More than 80 societies, including a Pakistani students\' association.', icon: 'community' },
    ],
    accommodation: [
      { label: 'Type', value: 'On-campus hostel or off-campus condominium' },
      { label: 'Distance to classes', value: '10 minutes by campus shuttle' },
      { label: 'Includes', value: 'Bed, desk, air conditioning, laundry' },
      { label: 'Kitchen', value: 'Pantry on each floor' },
      { label: 'Curfew', value: 'Midnight check-in for hostel blocks' },
    ],
    requirements: [
      'Enrolled Riphah student with a minimum CGPA of 2.5',
      'Completed at least two semesters before departure',
      'Passport valid for at least 18 months',
      'English proficiency: IELTS 5.5 or equivalent',
      'Medical screening completed in Pakistan and again in Malaysia',
      'Signed learning agreement and parental consent',
    ],
    scholarships: [
      { label: 'MMU Global Mobility Award', amount: 'USD 400', note: 'Awarded to the top 12 applicants by CGPA.' },
      { label: 'Riphah Merit Travel Support', amount: 'Up to 50% airfare', note: 'For students with CGPA above 3.5.' },
    ],
    visa: {
      title: 'Student Pass through EMGS',
      summary: 'MMU applies for your Student Pass through the Education Malaysia Global Services portal. You collect the approval letter, then enter Malaysia on a single-entry visa.',
      steps: [
        'MMU submits your Student Pass application to EMGS',
        'Upload your passport, photographs and medical report',
        'Receive the Visa Approval Letter by email',
        'Collect the single-entry visa from the Malaysian high commission, Islamabad',
        'Complete the medical screening and Student Pass endorsement after arrival',
      ],
    },
    livingTips: [
      { label: 'Climate', value: 'Hot and humid all year (24 to 33 C) with frequent afternoon rain.' },
      { label: 'Currency', value: 'Malaysian ringgit (MYR)' },
      { label: 'Getting there', value: 'Fly to Kuala Lumpur (KLIA), then a 25-minute transfer to Cyberjaya.' },
      { label: 'Food', value: 'Halal food is everywhere, and Pakistani restaurants are nearby.' },
      { label: 'Prayer space', value: 'Surau (prayer room) in every building and a campus mosque.' },
    ],
    faqs: [
      { question: 'Is the programme taught in English?', answer: 'Yes. All exchange courses at MMU are taught in English.' },
      { question: 'How soon should I prepare my visa documents?', answer: 'Start as soon as you receive the offer letter. EMGS processing usually takes three to five weeks.' },
      { question: 'Can I travel around Malaysia?', answer: 'Yes. Weekend trips to Kuala Lumpur, Malacca and Penang are popular and inexpensive.' },
      { question: 'Will my courses count at Riphah?', answer: 'Course equivalency requests are approved by your advisor before departure, so you know which credits transfer.' },
    ],
    contact: {
      email: 'exchange@mmu.example',
      phone: '+60 3 0000 0000',
      address: 'Global Office, Multimedia University, Persiaran Multimedia, Cyberjaya, Selangor, Malaysia',
      website: 'https://www.mmu.example',
    },
  },
  {
    slug: 'istanbul-aydin-university',
    name: 'Istanbul Aydin University',
    shortName: 'IAU',
    country: 'Turkiye',
    flag: '🇹🇷',
    city: 'Istanbul',
    region: 'Marmara Region',
    tagline: 'Study across two continents in one of the world\'s great cities.',
    gradient: 'from-[#4a0d12] via-[#9f1239] to-[#c2410c]',
    rating: 4.6,
    about: [
      'Istanbul Aydin University has campuses in Istanbul, a city that spans Europe and Asia. It is known for engineering, architecture and health sciences, with a large international student body.',
      'Exchange students find an easy bridge between cultures. The city has centuries of history, a large Muslim community, and excellent public transport to every corner of the metropolis.',
    ],
    facts: [
      { label: 'Founded', value: '2003' },
      { label: 'Students', value: '~35,000' },
      { label: 'International students', value: '22%' },
      { label: 'Language of instruction', value: 'English / Turkish' },
      { label: 'Campus setting', value: 'Urban, Istanbul' },
      { label: 'Exchange seats per year', value: '25' },
    ],
    highlights: [
      'English-taught engineering and business courses',
      'Central location with metro access to the old city',
      'Strong architecture and design studios',
      'Turkish language and culture workshops for exchange students',
    ],
    programmes: [
      {
        name: 'BSc in Software Engineering',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Software processes, algorithms, operating systems and data mining for business intelligence.',
      },
      {
        name: 'BA in Business Administration',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Management, marketing, finance and entrepreneurship with Istanbul business case studies.',
      },
      {
        name: 'BSc in Architecture',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Design studios, architectural history and building technology in a historic city.',
      },
      {
        name: 'BSc in Computer Engineering',
        level: 'Undergraduate',
        duration: '1 semester exchange',
        language: 'English',
        credits: '15 - 18 credits',
        description: 'Computer vision, embedded systems, networking and artificial intelligence.',
      },
    ],
    intakes: [
      buildIntake('Fall', 2026, '2026-09-21', 25, 25, iauContext),
      buildIntake('Spring', 2027, '2027-02-15', 25, 11, iauContext),
      buildIntake('Fall', 2027, '2027-09-20', 25, 2, iauContext),
    ],
    costs: [
      { label: 'Tuition', amount: 'Waived', note: 'Exchange students pay tuition at Riphah only.' },
      { label: 'Student residence (per semester)', amount: '~USD 1,100', note: 'Shared room in a partner residence.' },
      { label: 'Meals (per month)', amount: '~USD 200', note: 'Campus cafeteria and local restaurants.' },
      { label: 'Health insurance (per semester)', amount: '~USD 90', note: 'Mandatory for residence permit.' },
      { label: 'Istanbulkart transport (per month)', amount: '~USD 20', note: 'Discounted student fare on metro, tram and bus.' },
      { label: 'Visa and residence permit', amount: '~USD 150', note: 'Student visa and residence permit card.' },
    ],
    facilities: [
      { title: 'Library', description: 'Multi-floor library with study pods and design archives.', icon: 'library' },
      { title: 'Engineering labs', description: 'Computer vision, robotics, networks and prototyping labs.', icon: 'lab' },
      { title: 'Sports centre', description: 'Indoor courts, gym and a football pitch.', icon: 'gym' },
      { title: 'Cafeterias', description: 'Turkish menus with plenty of halal options.', icon: 'food' },
      { title: 'Campus Wi-Fi', description: 'High-speed Wi-Fi across campus and residences.', icon: 'wifi' },
      { title: 'Health centre', description: 'Health services and a partner hospital group.', icon: 'health' },
      { title: 'Metro access', description: 'Ten minutes to the nearest metro line, with regular shuttle service.', icon: 'transport' },
      { title: 'Student communities', description: 'International student club, photography society and a football league.', icon: 'community' },
    ],
    accommodation: [
      { label: 'Type', value: 'Partner student residence or shared apartment' },
      { label: 'Distance to classes', value: '15 minutes by shuttle or metro' },
      { label: 'Includes', value: 'Bed, desk, heating, Wi-Fi, laundry' },
      { label: 'Kitchen', value: 'Shared kitchen in every apartment' },
      { label: 'Curfew', value: 'None' },
    ],
    requirements: [
      'Enrolled Riphah student with a minimum CGPA of 2.6',
      'Completed at least two semesters before departure',
      'Passport valid for at least 12 months after arrival',
      'English proficiency: IELTS 5.5 or equivalent',
      'Proof of funds and health insurance',
      'Signed learning agreement and parental consent',
    ],
    scholarships: [
      { label: 'IAU Partner Scholarship', amount: 'USD 600', note: 'Offered to 8 students each intake.' },
      { label: 'Riphah Merit Travel Support', amount: 'Up to 50% airfare', note: 'For students with CGPA above 3.5.' },
    ],
    visa: {
      title: 'Student visa and residence permit',
      summary: 'Apply for a student visa at the Turkish embassy in Islamabad, then book a residence permit appointment in Istanbul within 30 days of arrival.',
      steps: [
        'Receive the acceptance letter from IAU',
        'Apply for a student visa at the Turkish embassy, Islamabad',
        'Book an e-residence permit appointment after arrival',
        'Submit passport, insurance and student certificate',
        'Collect the residence permit card',
      ],
    },
    livingTips: [
      { label: 'Climate', value: 'Mild, rainy winters and hot, humid summers.' },
      { label: 'Currency', value: 'Turkish lira (TRY)' },
      { label: 'Getting there', value: 'Fly to Istanbul Airport (IST), then metro or airport shuttle (about 1 hour).' },
      { label: 'Food', value: 'Halal food is standard. Try street simit and local kebab houses.' },
      { label: 'Prayer space', value: 'Mosques within walking distance and a campus prayer room.' },
    ],
    faqs: [
      { question: 'Do I need to speak Turkish?', answer: 'No. Your exchange courses are in English, and daily Turkish is easy to pick up with the university\'s workshops.' },
      { question: 'Is Istanbul expensive?', answer: 'Costs are moderate for a major city. Student transport fares and campus meals keep monthly costs low.' },
      { question: 'How do I register for classes?', answer: 'Your advisor shares an approved course list. You confirm your registration with IAU during orientation week.' },
      { question: 'Can I visit other European cities?', answer: 'Yes, but check Schengen visa rules separately, since your Turkish student visa does not cover them.' },
    ],
    contact: {
      email: 'exchange@iau.example',
      phone: '+90 212 000 0000',
      address: 'International Relations Office, Istanbul Aydin University, Istanbul, Turkiye',
      website: 'https://www.iau.example',
    },
  },
];

export const getUniversityProfile = (slug: string | undefined) =>
  universityProfiles.find((profile) => profile.slug === slug);
