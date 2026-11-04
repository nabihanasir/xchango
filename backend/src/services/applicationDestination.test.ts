import Country from '../models/Country';
import University from '../models/University';
import { validateUniversitySelection } from './applicationService';

jest.mock('../models/Country');
jest.mock('../models/University');
jest.mock('../models/User');
jest.mock('../models/Course');
jest.mock('../models/AdvisorProfile');
jest.mock('../models/Application');
jest.mock('../models/Notification');
jest.mock('./aiRecommendation.service', () => ({ getCourseRecommendations: jest.fn() }));
jest.mock('./studentService', () => ({ ensureStudentProfile: jest.fn() }));

const MockedCountry = Country as jest.Mocked<typeof Country>;
const MockedUniversity = University as jest.Mocked<typeof University>;

beforeEach(() => jest.clearAllMocks());

describe('validateUniversitySelection (countries and universities come from the database)', () => {
  it('accepts a published university of an active country and returns the stored country name', async () => {
    MockedCountry.findOne.mockResolvedValue({ _id: 'c1', name: 'Japan' } as any);
    MockedUniversity.findOne.mockResolvedValue({ _id: 'u1' } as any);

    await expect(validateUniversitySelection('japan', 'TKU')).resolves.toBe('Japan');
    expect(MockedUniversity.findOne).toHaveBeenCalledWith({
      countryId: 'c1',
      shortName: 'TKU',
      status: { $ne: 'draft' },
    });
  });

  it('rejects a country an admin has not added (or has deactivated)', async () => {
    MockedCountry.findOne.mockResolvedValue(null as any);
    await expect(validateUniversitySelection('Narnia', 'XYZ')).rejects.toMatchObject({
      code: 'COUNTRY_NOT_SUPPORTED',
    });
    expect(MockedUniversity.findOne).not.toHaveBeenCalled();
  });

  it('rejects a university that is a draft, unknown, or belongs to another country', async () => {
    MockedCountry.findOne.mockResolvedValue({ _id: 'c1', name: 'Japan' } as any);
    MockedUniversity.findOne.mockResolvedValue(null as any);
    await expect(validateUniversitySelection('Japan', 'MMU')).rejects.toMatchObject({
      code: 'UNIVERSITY_NOT_ALLOWED',
    });
  });

  it('treats the country name as plain text, not a pattern', async () => {
    MockedCountry.findOne.mockResolvedValue(null as any);
    await expect(validateUniversitySelection('.*', 'X')).rejects.toMatchObject({ code: 'COUNTRY_NOT_SUPPORTED' });
    const query = MockedCountry.findOne.mock.calls[0][0] as any;
    expect(query.name.test('Japan')).toBe(false);
  });
});
