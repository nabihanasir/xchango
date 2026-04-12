import Country from '../models/Country';
import University from '../models/University';
import Course from '../models/Course';

export const listCountries = async () => Country.find().sort({ name: 1 });

export const listUniversities = async () =>
  University.find()
    .populate('countryId', 'name code')
    .sort({ name: 1 });

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
    .sort({ name: 1 });
};
