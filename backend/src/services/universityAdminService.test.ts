import AdvisorProfile from '../models/AdvisorProfile';
import Country from '../models/Country';
import Course from '../models/Course';
import University from '../models/University';
import User from '../models/User';
import { assignPendingApplicationsForCountry } from './applicationService';
import { createHostCourse, getPublishIssues, saveUniversity, setCountryAdvisors } from './universityAdminService';

jest.mock('../models/AdvisorProfile');
jest.mock('../models/Country');
jest.mock('../models/Course');
jest.mock('../models/University');
jest.mock('../models/User');
jest.mock('./applicationService', () => ({ assignPendingApplicationsForCountry: jest.fn().mockResolvedValue(2) }));

const MockedCountry = Country as jest.Mocked<typeof Country>;
const MockedUniversity = University as jest.Mocked<typeof University>;
const MockedCourse = Course as jest.Mocked<typeof Course>;
const MockedAdvisorProfile = AdvisorProfile as jest.Mocked<typeof AdvisorProfile>;
const MockedUser = User as jest.Mocked<typeof User>;

const readyUniversity: any = {
  name: 'Example University',
  shortName: 'EXU',
  city: 'Springfield',
  website: 'https://example.edu',
  seatLimit: 20,
  intakes: [{}],
  programmes: [{}],
  contact: { email: 'info@example.edu' },
};

beforeEach(() => jest.clearAllMocks());

describe('getPublishIssues', () => {
  it('is empty when everything is present', () => {
    expect(getPublishIssues(readyUniversity, 1, 1)).toEqual([]);
  });

  it('lists every missing requirement', () => {
    const issues = getPublishIssues(
      { name: 'X', shortName: '', city: '', website: '', seatLimit: 0, intakes: [], programmes: [], contact: { email: '' } } as any,
      0,
      0
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Short code'),
        'City',
        'Website',
        'Contact email',
        expect.stringContaining('Seat limit'),
        'At least one intake',
        'At least one programme',
        expect.stringContaining('host course'),
        expect.stringContaining('advisor'),
      ])
    );
  });
});

describe('saveUniversity validation', () => {
  it('requires a name', async () => {
    await expect(saveUniversity(null, { shortName: 'EXU', seatLimit: 5 })).rejects.toThrow('name is required');
  });

  it('requires a short code', async () => {
    await expect(saveUniversity(null, { name: 'Example', seatLimit: 5 })).rejects.toThrow('Short code is required');
  });

  it('requires a country', async () => {
    await expect(saveUniversity(null, { name: 'Example', shortName: 'EXU', seatLimit: 5 })).rejects.toThrow(
      'Country is required'
    );
  });

  it('refuses a duplicate name', async () => {
    MockedCountry.findOne.mockResolvedValue({ _id: 'c1', name: 'Malaysia' } as any);
    MockedUniversity.findOne.mockResolvedValue({ _id: 'u1' } as any);
    await expect(
      saveUniversity(null, { name: 'Example', shortName: 'EXU', seatLimit: 5, country: { name: 'Malaysia', code: 'MY' } })
    ).rejects.toThrow('already exists');
  });

  it('refuses to publish while requirements are missing, and creates nothing', async () => {
    MockedCountry.findOne.mockResolvedValue(null as any);
    MockedUniversity.findOne.mockResolvedValue(null as any);
    MockedAdvisorProfile.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) } as any);

    await expect(
      saveUniversity(null, {
        name: 'Example',
        shortName: 'EXU',
        seatLimit: 5,
        status: 'published',
        country: { name: 'Narnia', code: 'NA' },
      })
    ).rejects.toThrow('not ready to publish');
    expect(MockedCountry.create).not.toHaveBeenCalled();
  });

  it('rejects an intake with a bad date', async () => {
    MockedCountry.findOne.mockResolvedValue({ _id: 'c1', name: 'Malaysia' } as any);
    MockedUniversity.findOne.mockResolvedValue(null as any);
    MockedAdvisorProfile.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) } as any);
    await expect(
      saveUniversity(null, {
        name: 'Example',
        shortName: 'EXU',
        seatLimit: 5,
        country: { name: 'Malaysia', code: 'MY' },
        intakes: [{ season: 'Fall', startDate: 'soon', applicationDeadline: '2027-01-01', seatsTotal: 5 }],
      })
    ).rejects.toThrow('valid dates');
  });

  it('rejects advisor ids that are not advisors', async () => {
    MockedCountry.findOne.mockResolvedValue({ _id: 'c1', name: 'Malaysia' } as any);
    MockedUniversity.findOne.mockResolvedValue(null as any);
    MockedUser.find.mockResolvedValue([] as any);
    await expect(
      saveUniversity(null, {
        name: 'Example',
        shortName: 'EXU',
        seatLimit: 5,
        country: { name: 'Malaysia', code: 'MY' },
        advisorIds: ['64b000000000000000000001'],
      })
    ).rejects.toThrow('Advisor selection is invalid');
  });
});

describe('setCountryAdvisors', () => {
  it('adds the country to the chosen advisors, removes it from the rest, then assigns waiting applications', async () => {
    const assigned = await setCountryAdvisors('Malaysia', ['a1', 'a2']);

    expect(MockedAdvisorProfile.updateMany).toHaveBeenNthCalledWith(
      1,
      { userId: { $in: ['a1', 'a2'] } },
      { $addToSet: { countries: 'Malaysia' } }
    );
    expect(MockedAdvisorProfile.updateMany).toHaveBeenNthCalledWith(
      2,
      { userId: { $nin: ['a1', 'a2'] }, countries: 'Malaysia' },
      { $pull: { countries: 'Malaysia' } }
    );
    expect(assignPendingApplicationsForCountry).toHaveBeenCalledWith('Malaysia');
    expect(assigned).toBe(2);
  });
});

describe('createHostCourse', () => {
  const university = { _id: 'u1' };

  it('requires a university that exists', async () => {
    MockedUniversity.findById.mockResolvedValue(null as any);
    await expect(
      createHostCourse('admin1', { universityId: '64b000000000000000000001', title: 'Databases', code: 'DB1', creditHours: 3 })
    ).rejects.toThrow('University not found');
  });

  it('rejects a duplicate code within the university', async () => {
    MockedUniversity.findById.mockResolvedValue(university as any);
    MockedCourse.exists.mockResolvedValue({ _id: 'x' } as any);
    await expect(
      createHostCourse('admin1', { universityId: '64b000000000000000000001', title: 'Databases', code: 'db1', creditHours: 3 })
    ).rejects.toThrow('already exists');
  });

  it('creates a host course tied to the university', async () => {
    MockedUniversity.findById.mockResolvedValue(university as any);
    MockedCourse.exists.mockResolvedValue(null as any);
    MockedCourse.create.mockResolvedValue({ _id: 'c1' } as any);

    await createHostCourse('admin1', {
      universityId: '64b000000000000000000001',
      title: ' Databases ',
      code: 'db1',
      creditHours: 3,
      instructorEmail: 'Prof@Example.edu',
    });

    expect(MockedCourse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Databases',
        code: 'DB1',
        type: 'host',
        isHomeCourse: false,
        universityId: 'u1',
        instructorEmail: 'prof@example.edu',
        createdBy: 'admin1',
      })
    );
  });
});
