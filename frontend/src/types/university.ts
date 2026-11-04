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

export type MilestoneOwner = 'Student' | 'Riphah RIO' | 'Host university' | 'Embassy / Immigration';

export interface IntakeMilestone {
  title: string;
  date: string;
  description: string;
  owner: MilestoneOwner;
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

export interface CatalogCountry {
  _id: string;
  name: string;
  code: string;
  flag?: string;
  image?: string;
  isActive?: boolean;
}

/** A university exactly as the API returns it (country populated). */
export interface CatalogUniversity {
  _id: string;
  name: string;
  shortName?: string;
  slug?: string;
  countryId: CatalogCountry;
  website?: string;
  seatLimit: number;
  status?: 'draft' | 'published';
  city?: string;
  region?: string;
  tagline?: string;
  image?: string;
  about?: string[];
  facts?: UniversityFact[];
  highlights?: string[];
  programmes?: UniversityProgramme[];
  intakes?: UniversityIntake[];
  costs?: UniversityCost[];
  facilities?: UniversityFacility[];
  accommodation?: UniversityFact[];
  requirements?: string[];
  scholarships?: UniversityCost[];
  visa?: { title?: string; summary?: string; steps?: string[] };
  livingTips?: UniversityFact[];
  faqs?: UniversityFaq[];
  contact?: { email?: string; phone?: string; address?: string; website?: string };
}

/** What the university detail page renders (every list present, milestones filled in). */
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
