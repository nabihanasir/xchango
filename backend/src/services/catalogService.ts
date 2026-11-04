import Country from '../models/Country';
import University from '../models/University';
import Course from '../models/Course';

/** Legacy documents have no status, so anything other than an explicit draft counts as visible. */
const VISIBLE = { status: { $ne: 'draft' } };

/** Admins see every country; everyone else only sees countries that have at least one published university. */
export const listCountries = async (options: { includeAll?: boolean } = {}) => {
  if (options.includeAll) {
    return Country.find({ isActive: { $ne: false } }).sort({ name: 1 });
  }

  const countryIds = await University.distinct('countryId', VISIBLE);
  return Country.find({ _id: { $in: countryIds }, isActive: { $ne: false } }).sort({ name: 1 });
};

/** Admins also see drafts; the full admin view lives in universityAdminService. */
export const listUniversities = async (options: { includeDrafts?: boolean } = {}) =>
  University.find(options.includeDrafts ? {} : VISIBLE)
    .populate('countryId', 'name code flag image')
    .sort({ name: 1 });

export const getUniversityBySlug = async (slug: string) =>
  University.findOne({ slug: slug.toLowerCase(), ...VISIBLE }).populate('countryId', 'name code flag image');

export const listCourses = async (filters: {
  universityId?: string;
  type?: string;
}) => {
  const query: Record<string, string> = {};

  if (filters.universityId) {
    query.universityId = filters.universityId;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  return Course.find(query)
    .populate({
      path: 'universityId',
      select: 'name countryId',
      populate: {
        path: 'countryId',
        select: 'name code',
      },
    })
    .sort({ title: 1, name: 1 });
};
