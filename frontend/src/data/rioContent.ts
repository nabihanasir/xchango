export interface PartnerUniversity {
  id: string;
  name: string;
  country: string;
  flag: string;
  highlight: string;
  description: string;
  programs: string[];
  courses: string[];
}

export const rioHighlights = [
  'Student and faculty exchange opportunities',
  'Cross-border academic collaborations and joint initiatives',
  'Global learning exposure through partner universities',
];

export const partnerUniversities: PartnerUniversity[] = [
  {
    id: 'kyungdong',
    name: 'Kyungdong University Global',
    country: 'South Korea',
    flag: 'KR',
    highlight: 'Smart computing track with future-facing technologies',
    description:
      'A South Korean partner focused on modern computing pathways that support international mobility and applied innovation.',
    programs: ['B.Sc. Smart Computing'],
    courses: ['AI', 'Robotics', 'Data Science', 'Cybersecurity', 'IoT'],
  },
  {
    id: 'multimedia',
    name: 'Multimedia University',
    country: 'Malaysia',
    flag: 'MY',
    highlight: 'Broad digital technology pathways for high-demand careers',
    description:
      'A Malaysian partner university offering strong computing and IT programs with practical, industry-relevant specialization areas.',
    programs: ['Computer Science', 'Information Technology'],
    courses: ['AI', 'Ethical Hacking', 'Machine Learning', 'Networking', 'Mobile App Dev', 'Blockchain'],
  },
  {
    id: 'istanbul-aydin',
    name: 'Istanbul Aydin University',
    country: 'Turkey',
    flag: 'TR',
    highlight: 'Engineering and MIS studies with applied systems thinking',
    description:
      'A Turkish partner institution supporting students interested in software systems, business technologies, and advanced computing topics.',
    programs: ['Computer Engineering', 'MIS'],
    courses: ['Algorithms', 'OS Design', 'Computer Vision', 'SDLC', 'Data Mining'],
  },
];

export const rioStats = [
  { label: 'International Partners', value: '20+' },
  { label: 'Focus Areas', value: 'Tech & Mobility' },
  { label: 'Student Pathways', value: 'Exchange & Progression' },
];
