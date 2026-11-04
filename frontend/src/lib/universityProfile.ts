import type {
  CatalogUniversity,
  IntakeMilestone,
  UniversityIntake,
  UniversityProfile,
} from '../types/university';

const DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_GRADIENT = 'from-dark-blue via-dark-blue-light to-dark-blue';

export const shiftDate = (isoDate: string, days: number) =>
  new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10);

interface TimelineContext {
  shortName: string;
  city: string;
}

/**
 * Every intake follows the same stages, dated relative to the first day of classes. Admins only enter the start
 * date and deadline; the stages are generated unless the intake already carries its own milestones.
 */
export const buildMilestones = (startDate: string, context: TimelineContext): IntakeMilestone[] => [
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
    title: 'Student visa application',
    date: shiftDate(startDate, -40),
    description: 'Submit your passport, offer letter, financial proof and photographs, then track the status in the Visa section.',
    owner: 'Embassy / Immigration',
  },
  {
    title: `Travel to ${context.city || 'your host city'}`,
    date: shiftDate(startDate, -7),
    description: 'Book flights once your visa is approved. Mark your arrival in the portal when you land.',
    owner: 'Student',
  },
  {
    title: 'Orientation week',
    date: shiftDate(startDate, -3),
    description: 'Campus tour, buddy matching and registration help at the host university.',
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

/** Turns an API university into what the detail page needs, with safe defaults for anything an admin left empty. */
export const toUniversityProfile = (university: CatalogUniversity): UniversityProfile => {
  const shortName = university.shortName || university.name;
  const city = university.city || '';
  const intakes: UniversityIntake[] = (university.intakes ?? []).map((intake) => ({
    ...intake,
    milestones: intake.milestones?.length ? intake.milestones : buildMilestones(intake.startDate, { shortName, city }),
  }));

  return {
    slug: university.slug || university._id,
    name: university.name,
    shortName,
    country: university.countryId?.name ?? '',
    flag: university.countryId?.flag ?? '',
    city,
    region: university.region || '',
    tagline: university.tagline || '',
    gradient: DEFAULT_GRADIENT,
    about: university.about ?? [],
    facts: university.facts ?? [],
    highlights: university.highlights ?? [],
    programmes: university.programmes ?? [],
    intakes,
    costs: university.costs ?? [],
    facilities: university.facilities ?? [],
    accommodation: university.accommodation ?? [],
    requirements: university.requirements ?? [],
    scholarships: university.scholarships ?? [],
    visa: {
      title: university.visa?.title || 'Student visa',
      summary: university.visa?.summary || '',
      steps: university.visa?.steps ?? [],
    },
    livingTips: university.livingTips ?? [],
    faqs: university.faqs ?? [],
    contact: {
      email: university.contact?.email || '',
      phone: university.contact?.phone || '',
      address: university.contact?.address || '',
      website: university.contact?.website || university.website || '',
    },
  };
};
