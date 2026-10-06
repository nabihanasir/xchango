// Content for the Riphah International Office page (/dashboard/international-office).
// Source: https://riphah.edu.pk/rio/

export const RIO_WEBSITE = 'https://riphah.edu.pk/rio/';

export const officeIntro = {
  eyebrow: 'Riphah International Office',
  title: 'Global partnerships for your academic growth',
  paragraphs: [
    'Riphah International Office (RIO) at Riphah International University is dedicated to fostering global partnerships, enhancing academic collaborations, and facilitating student and faculty mobility.',
    'Our mission is to connect Riphah University with leading institutions around the world, providing our students and faculty with enriching international experiences that contribute to their academic and professional growth.',
    'Riphah International University has established strategic partnerships with several renowned international universities, enabling opportunities for student exchange programs, joint research, and academic collaboration. Explore our collaborations and find out how you can benefit from these opportunities.',
  ],
};

export const exchangeProgram = {
  title: 'Student Exchange Program',
  paragraphs: [
    'The Student Exchange Program at Riphah International University offers students a unique opportunity to study abroad at partner institutions, gaining global exposure and academic enrichment.',
    'This program enables students to immerse themselves in diverse cultures, engage with international academic environments, and build networks with peers and professionals worldwide.',
  ],
  advantages: [
    { title: 'Global Exposure', description: 'Experience different cultures, traditions, and academic environments.' },
    {
      title: 'Academic Growth',
      description: 'Study specialized courses at top international universities and earn credits towards your degree.',
    },
    { title: 'Research Opportunities', description: 'Engage in cutting-edge research with global leaders in your field.' },
    { title: 'Networking', description: 'Build relationships with students, faculty, and professionals from around the world.' },
    {
      title: 'Career Advancement',
      description: 'Strengthen your resume with international experience highly valued by employers.',
    },
  ],
};

export interface PartnerInstitution {
  name: string;
  location: string;
}

const partner = (name: string, location: string): PartnerInstitution => ({ name, location });

// Exchange of students for study, research, or training purposes.
export const exchangePartners: PartnerInstitution[] = [
  partner('University of Luton', 'UK'),
  partner('Azerbaijan State Economic University', 'Azerbaijan'),
  partner('University of Massachusetts Civic Initiative', 'USA'),
  partner('International Shari’ah Research Academy for Islamic Finance', 'Malaysia'),
  partner('Islamic University of Maldives', 'Maldives'),
  partner('Istanbul University', 'Turkiye'),
  partner('Universiti Tun Hussein Onn Malaysia', 'Malaysia'),
  partner('Zaman Technologies (Leverify LLC)', 'USA'),
  partner('Azerbaijan Medical University', 'Azerbaijan'),
  partner('University of Haripur', 'Pakistan'),
  partner('Universiti Telekom Sdn Bhd (Multimedia University)', 'Malaysia'),
  partner('Westford Education Group, London', 'UK'),
  partner('Ibn Haldun University, Istanbul', 'Turkiye'),
  partner('Usak University', 'Turkiye'),
  partner('Villa College Male', 'Maldives'),
  partner('Academy of Leadership Sciences Switzerland (ALSS)', 'Switzerland'),
  partner('Universitas Negeri Padang', 'Indonesia'),
  partner('Istanbul Aydin University', 'Turkiye'),
  partner('Seoul National University Bundang Hospital', 'South Korea'),
  partner('Kyungdong University Global', 'South Korea'),
  partner('Hotel & Tourism Management Institute', 'Switzerland'),
  partner('International Medical University', 'Malaysia'),
  partner('Biruni University', 'Turkiye'),
  partner('Medipol University', 'Turkiye'),
  partner('Istanbul Kulture University', 'Turkiye'),
  partner('Gebze University', 'Turkiye'),
  partner('Woosong University', 'South Korea'),
  partner('INTI University', 'Malaysia'),
  partner('Istinye University', 'Turkiye'),
  partner('Management Sciences University', 'Malaysia'),
  partner('Universitas Islam Indonesia', 'Indonesia'),
  partner('University of Cyberjaya', 'Malaysia'),
];

export const collaborations = {
  title: 'Collaborations',
  paragraphs: [
    'Riphah International University has established a robust network of collaborations with renowned international universities, fostering academic and research excellence.',
    'These partnerships span across multiple countries, enabling student and faculty exchanges, joint research projects, and academic programs. Through these collaborations, Riphah provides its students and faculty with global exposure, access to diverse academic resources, and opportunities to engage in cross-cultural learning.',
    'These alliances are integral to Riphah’s mission to cultivate a global academic community and enhance the quality of education and research.',
  ],
};

// Faculty exchange, collaborative research, joint projects, or preparatory programs (credit transfers, dual or joint degrees).
export const collaborationPartners: PartnerInstitution[] = [
  partner('University of Luton', 'UK'),
  partner('The Northern Consortium (NCUK)', 'UK'),
  partner('Islamic Research & Training Institute, Jeddah', 'Saudi Arabia'),
  partner('University of Leeds', 'UK'),
  partner('International Institute of Islamic Thought (IIIT), Virginia', 'USA'),
  partner('Islamic University of Maldives', 'Maldives'),
  partner('International Shari’ah Research Academy for Islamic Finance', 'Malaysia'),
  partner('Azerbaijan State Economic University', 'Azerbaijan'),
  partner('University of Massachusetts Civic Initiative', 'USA'),
  partner('Western Sydney University', 'Australia'),
  partner('James Cook University, Queensland', 'Australia'),
  partner('Universiti Telekom Sdn Bhd (Multimedia University)', 'Malaysia'),
  partner('Ibn Haldun University, Istanbul', 'Turkiye'),
  partner('Usak University', 'Turkiye'),
  partner('International Balkan University', 'North Macedonia'),
  partner('Villa College Male', 'Maldives'),
  partner('Academy of Leadership Sciences Switzerland (ALSS)', 'Switzerland'),
  partner('Universitas Negeri Padang', 'Indonesia'),
  partner('Istanbul Aydin University', 'Turkiye'),
  partner('Kyungdong University Global', 'South Korea'),
  partner('Universiti Tun Hussein Onn Malaysia', 'Malaysia'),
  partner('Seoul National University Bundang Hospital', 'South Korea'),
  partner('Zaman Technologies (Leverify LLC)', 'USA'),
  partner('Azerbaijan Medical University', 'Azerbaijan'),
  partner('RAK Medical & Health Sciences University', 'UAE'),
  partner('International Medical University', 'Malaysia'),
  partner('Medical College of Northwest Minorities University', 'China'),
];
