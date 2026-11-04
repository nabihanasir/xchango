import mongoose from 'mongoose';
import AdvisorProfile from '../models/AdvisorProfile';
import Country from '../models/Country';
import Course, { CourseType } from '../models/Course';
import University, { IUniversity } from '../models/University';
import User, { UserRole } from '../models/User';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { assignPendingApplicationsForCountry } from './applicationService';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(text).filter(Boolean) : [];

const pairList = <K extends string>(value: unknown, keys: readonly K[]): Array<Record<K, string>> =>
  Array.isArray(value)
    ? value
        .map((row) => {
          const entry = {} as Record<K, string>;
          keys.forEach((key) => {
            entry[key] = text((row as Record<string, unknown>)?.[key]);
          });
          return entry;
        })
        .filter((entry) => Object.values<string>(entry).some(Boolean))
    : [];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const FACILITY_ICONS = ['library', 'lab', 'gym', 'food', 'wifi', 'health', 'transport', 'community'];
const MILESTONE_OWNERS = ['Student', 'Riphah RIO', 'Host university', 'Embassy / Immigration'];

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const fail = (message: string, reason: string, solution: string, code: string): never => {
  throw new ValidationError(message, reason, solution, code);
};

const cleanIntakes = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set<string>();
  return value.map((raw, index) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const season = row.season === 'Spring' ? 'Spring' : 'Fall';
    const startDate = text(row.startDate);
    const applicationDeadline = text(row.applicationDeadline);
    if (!isIsoDate(startDate) || !isIsoDate(applicationDeadline)) {
      fail(
        `Intake ${index + 1} needs valid dates.`,
        'Start date and application deadline must be real dates (YYYY-MM-DD).',
        'Pick both dates for every intake, or remove the intake.',
        'UNIVERSITY_INTAKE_DATE_INVALID'
      );
    }

    const seatsTotal = Number(row.seatsTotal);
    const seatsTaken = Number(row.seatsTaken ?? 0);
    if (!Number.isFinite(seatsTotal) || seatsTotal < 0 || !Number.isFinite(seatsTaken) || seatsTaken < 0) {
      fail(
        `Intake ${index + 1} has invalid seat numbers.`,
        'Seat counts must be zero or more.',
        'Enter whole numbers for total and taken seats.',
        'UNIVERSITY_INTAKE_SEATS_INVALID'
      );
    }

    const year = startDate.slice(0, 4);
    const baseId = text(row.id) || `${season.toLowerCase()}-${year}`;
    let id = baseId;
    let counter = 2;
    while (seenIds.has(id)) {
      id = `${baseId}-${counter}`;
      counter += 1;
    }
    seenIds.add(id);

    const milestones = Array.isArray(row.milestones)
      ? row.milestones
          .map((m) => {
            const milestone = (m ?? {}) as Record<string, unknown>;
            const owner = text(milestone.owner);
            return {
              title: text(milestone.title),
              date: text(milestone.date),
              description: text(milestone.description),
              owner: MILESTONE_OWNERS.includes(owner) ? owner : 'Student',
            };
          })
          .filter((milestone) => milestone.title && isIsoDate(milestone.date))
      : [];

    return {
      id,
      label: text(row.label) || `${season} ${year}`,
      season,
      startDate,
      applicationDeadline,
      seatsTotal: Math.floor(seatsTotal),
      seatsTaken: Math.floor(seatsTaken),
      milestones,
    };
  });
};

const cleanProgrammes = (value: unknown) =>
  pairList(value, ['name', 'level', 'duration', 'language', 'credits', 'description'] as const).filter(
    (programme) => programme.name
  );

const cleanFacilities = (value: unknown) =>
  pairList(value, ['title', 'description', 'icon'] as const)
    .filter((facility) => facility.title)
    .map((facility) => ({ ...facility, icon: FACILITY_ICONS.includes(facility.icon) ? facility.icon : 'community' }));

const cleanVisa = (value: unknown) => {
  const visa = (value ?? {}) as Record<string, unknown>;
  return { title: text(visa.title), summary: text(visa.summary), steps: textList(visa.steps) };
};

const cleanContact = (value: unknown, website: string) => {
  const contact = (value ?? {}) as Record<string, unknown>;
  const email = text(contact.email).toLowerCase();
  if (email && !EMAIL_PATTERN.test(email)) {
    fail(
      'Contact email is invalid.',
      'The university contact email is not in a valid format.',
      'Enter an address like exchange@university.edu or leave it empty.',
      'UNIVERSITY_EMAIL_INVALID'
    );
  }
  return { email, phone: text(contact.phone), address: text(contact.address), website: text(contact.website) || website };
};

interface CountryInput {
  name?: string;
  code?: string;
  flag?: string;
  image?: string;
}

export interface UniversityInput {
  countryId?: string;
  country?: CountryInput;
  countryImage?: string;
  name?: string;
  shortName?: string;
  website?: string;
  seatLimit?: number;
  status?: 'draft' | 'published';
  advisorIds?: string[];
  [key: string]: unknown;
}

const resolveCountry = async (input: UniversityInput) => {
  if (input.countryId) {
    if (!mongoose.Types.ObjectId.isValid(input.countryId)) {
      fail('Country is invalid.', 'The selected country id is not valid.', 'Pick a country again.', 'COUNTRY_INVALID');
    }
    const existing = await Country.findById(input.countryId);
    if (!existing) {
      throw new NotFoundError('Country not found.', 'No country matches that id.', 'Pick a country again.', 'COUNTRY_NOT_FOUND');
    }
    return { existing, draft: null as CountryInput | null };
  }

  const name = text(input.country?.name);
  const code = text(input.country?.code).toUpperCase();
  if (!name || !/^[A-Z]{2}$/.test(code)) {
    fail(
      'Country is required.',
      'No country was chosen.',
      'Search the country list and pick one.',
      'COUNTRY_REQUIRED'
    );
  }

  // The ISO code is the stable identity; the stored name wins so existing applications keep matching.
  const existing =
    (await Country.findOne({ code })) ||
    (await Country.findOne({ name: new RegExp(`^${escapeRegExp(name)}$`, 'i') }));
  return {
    existing,
    draft: { name, code, flag: text(input.country?.flag), image: text(input.country?.image) } as CountryInput,
  };
};

/** Active advisors only; throws when an id is not an advisor so a typo never silently drops someone. */
const validateAdvisorIds = async (advisorIds: unknown) => {
  const ids = [...new Set(Array.isArray(advisorIds) ? advisorIds.map(String) : [])];
  if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    fail('Advisor selection is invalid.', 'One of the selected advisors does not exist.', 'Reload the page and select again.', 'ADVISOR_INVALID');
  }
  const advisors = await User.find({ _id: { $in: ids }, role: UserRole.ADVISOR });
  if (advisors.length !== ids.length) {
    fail('Advisor selection is invalid.', 'One of the selected users is not an advisor.', 'Reload the page and select again.', 'ADVISOR_INVALID');
  }
  const profiles = await AdvisorProfile.countDocuments({ userId: { $in: ids } });
  if (profiles !== ids.length) {
    fail(
      'An advisor has no advisor profile.',
      'Every advisor needs a profile before they can supervise a country.',
      'Recreate the advisor account from the Users page.',
      'ADVISOR_PROFILE_MISSING'
    );
  }
  return ids;
};

export const getCountryAdvisorIds = async (countryName: string) => {
  const profiles = await AdvisorProfile.find({ countries: countryName }).select('userId');
  return profiles.map((profile) => String(profile.userId));
};

/**
 * Makes exactly these advisors responsible for a country (adds the country to their profiles and removes it from
 * everyone else's). Then applications that were waiting for an advisor are assigned.
 */
export const setCountryAdvisors = async (countryName: string, advisorIds: string[]) => {
  await AdvisorProfile.updateMany({ userId: { $in: advisorIds } }, { $addToSet: { countries: countryName } });
  await AdvisorProfile.updateMany(
    { userId: { $nin: advisorIds }, countries: countryName },
    { $pull: { countries: countryName } }
  );
  return assignPendingApplicationsForCountry(countryName);
};

/** What still blocks an admin from publishing; an empty list means the university is ready for students. */
export const getPublishIssues = (
  university: Pick<IUniversity, 'name' | 'shortName' | 'city' | 'website' | 'seatLimit' | 'intakes' | 'programmes' | 'contact'>,
  advisorCount: number,
  hostCourseCount: number
) => {
  const issues: string[] = [];
  if (!university.name) issues.push('University name');
  if (!university.shortName) issues.push('Short code (e.g. MMU)');
  if (!university.city) issues.push('City');
  if (!university.website) issues.push('Website');
  if (!university.contact?.email) issues.push('Contact email');
  if (!(university.seatLimit > 0)) issues.push('Seat limit above zero');
  if (!university.intakes?.length) issues.push('At least one intake');
  if (!university.programmes?.length) issues.push('At least one programme');
  if (hostCourseCount < 1) issues.push('At least one host course (add it under Home Courses → Host Courses)');
  if (advisorCount < 1) issues.push('At least one advisor for this country');
  return issues;
};

const uniqueSlug = async (base: string, excludeId?: string) => {
  const root = base || 'university';
  let slug = root;
  let counter = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await University.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${root}-${counter}`;
    counter += 1;
  }
  return slug;
};

/** Creates (no id) or updates (id) a university together with its country and the country's advisors. */
export const saveUniversity = async (universityId: string | null, input: UniversityInput) => {
  const current = universityId ? await University.findById(universityId) : null;
  if (universityId && !current) {
    throw new NotFoundError('University not found.', 'No university matches that id.', 'Refresh the list and try again.', 'UNIVERSITY_NOT_FOUND');
  }

  const name = text(input.name);
  const shortName = text(input.shortName).toUpperCase();
  if (!name) {
    fail('University name is required.', 'The name was empty.', 'Enter the university name.', 'UNIVERSITY_NAME_REQUIRED');
  }
  if (!shortName) {
    fail(
      'Short code is required.',
      'Applications refer to the university by its short code.',
      'Enter a short code such as MMU.',
      'UNIVERSITY_SHORT_NAME_REQUIRED'
    );
  }

  const seatLimit = Number(input.seatLimit ?? 0);
  if (!Number.isFinite(seatLimit) || seatLimit < 0) {
    fail('Seat limit is invalid.', 'The seat limit must be zero or more.', 'Enter a whole number.', 'UNIVERSITY_SEATS_INVALID');
  }

  const website = text(input.website);
  const { existing: existingCountry, draft } = await resolveCountry(input);
  const countryName = existingCountry?.name ?? draft!.name!;

  const sameName = await University.findOne({
    name: new RegExp(`^${escapeRegExp(name)}$`, 'i'),
    ...(universityId ? { _id: { $ne: universityId } } : {}),
  });
  if (sameName) {
    fail('University already exists.', 'Another university has the same name.', 'Edit the existing university instead.', 'UNIVERSITY_DUPLICATE');
  }

  if (existingCountry) {
    const sameCode = await University.findOne({
      countryId: existingCountry._id,
      shortName,
      ...(universityId ? { _id: { $ne: universityId } } : {}),
    });
    if (sameCode) {
      fail(
        'Short code already used in this country.',
        'Two universities in one country cannot share a short code.',
        'Choose a different short code.',
        'UNIVERSITY_SHORT_NAME_DUPLICATE'
      );
    }
  }

  const advisorIds =
    input.advisorIds !== undefined
      ? await validateAdvisorIds(input.advisorIds)
      : await getCountryAdvisorIds(countryName);

  const fields = {
    name,
    shortName,
    website,
    seatLimit: Math.floor(seatLimit),
    city: text(input.city),
    region: text(input.region),
    tagline: text(input.tagline),
    image: text(input.image),
    about: textList(input.about),
    facts: pairList(input.facts, ['label', 'value'] as const),
    highlights: textList(input.highlights),
    programmes: cleanProgrammes(input.programmes),
    intakes: cleanIntakes(input.intakes),
    costs: pairList(input.costs, ['label', 'amount', 'note'] as const),
    facilities: cleanFacilities(input.facilities),
    accommodation: pairList(input.accommodation, ['label', 'value'] as const),
    requirements: textList(input.requirements),
    scholarships: pairList(input.scholarships, ['label', 'amount', 'note'] as const),
    visa: cleanVisa(input.visa),
    livingTips: pairList(input.livingTips, ['label', 'value'] as const),
    faqs: pairList(input.faqs, ['question', 'answer'] as const),
    contact: cleanContact(input.contact, website),
  };

  const hostCourseCount = universityId
    ? await Course.countDocuments({ universityId, type: CourseType.HOST })
    : 0;
  const wantsPublish = input.status === 'published';
  if (wantsPublish) {
    const issues = getPublishIssues(fields as unknown as IUniversity, advisorIds.length, hostCourseCount);
    if (issues.length) {
      fail(
        'This university is not ready to publish.',
        `Missing: ${issues.join('; ')}.`,
        'Fill in the missing items, or save it as a draft.',
        'UNIVERSITY_NOT_READY'
      );
    }
  }

  const country =
    existingCountry ??
    (await Country.create({
      name: draft!.name,
      code: draft!.code,
      flag: draft!.flag,
      image: draft!.image,
    }));
  if (existingCountry && (draft?.flag || input.countryImage !== undefined)) {
    if (draft?.flag && !existingCountry.flag) existingCountry.flag = draft.flag;
    if (input.countryImage !== undefined) existingCountry.image = text(input.countryImage);
    await existingCountry.save();
  } else if (!existingCountry && input.countryImage !== undefined) {
    country.image = text(input.countryImage);
    await country.save();
  }

  const slug = current?.slug || (await uniqueSlug(slugify(name), universityId ?? undefined));
  const status = wantsPublish ? 'published' : 'draft';
  const university = current
    ? Object.assign(current, { ...fields, countryId: country._id, status })
    : new University({ ...fields, countryId: country._id, slug, status });
  if (current && !current.slug) {
    current.slug = slug;
  }
  await university.save();

  let assigned = 0;
  if (input.advisorIds !== undefined) {
    assigned = await setCountryAdvisors(country.name, advisorIds);
  }

  const saved = await University.findById(university._id).populate('countryId', 'name code flag image');
  return { university: saved, assignedApplications: assigned };
};

/** Everything the admin form needs, including drafts, advisor ids per country and host-course counts. */
export const listUniversitiesForAdmin = async () => {
  const universities = await University.find().populate('countryId', 'name code flag image').sort({ name: 1 }).lean();
  const hostCounts = await Course.aggregate([
    { $match: { type: CourseType.HOST, universityId: { $ne: null } } },
    { $group: { _id: '$universityId', count: { $sum: 1 } } },
  ]);
  const hostCountById = new Map(hostCounts.map((row) => [String(row._id), row.count as number]));

  const countryNames = [...new Set(universities.map((u: any) => u.countryId?.name).filter(Boolean))] as string[];
  const advisorIdsByCountry = new Map<string, string[]>();
  await Promise.all(
    countryNames.map(async (countryName) => {
      advisorIdsByCountry.set(countryName, await getCountryAdvisorIds(countryName));
    })
  );

  return universities.map((university: any) => {
    const advisorIds = advisorIdsByCountry.get(university.countryId?.name) ?? [];
    const hostCourseCount = hostCountById.get(String(university._id)) ?? 0;
    return {
      ...university,
      status: university.status ?? 'published',
      advisorIds,
      hostCourseCount,
      publishIssues: getPublishIssues(university, advisorIds.length, hostCourseCount),
    };
  });
};

export const createHostCourse = async (
  adminId: string,
  payload: {
    universityId?: string;
    code?: string;
    title?: string;
    creditHours?: number;
    description?: string;
    instructorName?: string;
    instructorEmail?: string;
  }
) => {
  if (!payload.universityId || !mongoose.Types.ObjectId.isValid(payload.universityId)) {
    fail('University is required.', 'A host course must belong to a university.', 'Choose a university.', 'COURSE_UNIVERSITY_REQUIRED');
  }
  const university = await University.findById(payload.universityId);
  if (!university) {
    throw new NotFoundError('University not found.', 'No university matches that id.', 'Refresh the list and try again.', 'UNIVERSITY_NOT_FOUND');
  }

  const title = text(payload.title);
  const creditHours = Number(payload.creditHours);
  const code = text(payload.code).toUpperCase();
  if (!title) {
    fail('Title is required.', 'The course title was not provided.', 'Enter a course title.', 'COURSE_TITLE_REQUIRED');
  }
  if (!code) {
    fail('Course code is required.', 'Host courses are identified by their code.', 'Enter a code such as MMU-CS101.', 'COURSE_CODE_REQUIRED');
  }
  if (!Number.isFinite(creditHours) || creditHours <= 0) {
    fail('Credit hours must be greater than zero.', 'The credit hours value is invalid.', 'Enter a positive number.', 'COURSE_CREDIT_HOURS_INVALID');
  }
  const email = text(payload.instructorEmail).toLowerCase();
  if (email && !EMAIL_PATTERN.test(email)) {
    fail('Instructor email is invalid.', 'The email is not in a valid format.', 'Enter name@university.edu or leave it empty.', 'COURSE_INSTRUCTOR_EMAIL_INVALID');
  }

  if (await Course.exists({ universityId: university._id, type: CourseType.HOST, code })) {
    fail('Course code already exists.', 'This university already has a host course with that code.', 'Use a different code.', 'COURSE_CODE_DUPLICATE');
  }

  return Course.create({
    title,
    name: title,
    code,
    description: text(payload.description),
    creditHours,
    instructorName: text(payload.instructorName),
    instructorEmail: email,
    universityId: university._id,
    type: CourseType.HOST,
    isHomeCourse: false,
    createdBy: adminId,
  });
};
