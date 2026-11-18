import StudentProfile from '../models/StudentProfile';
import { getStudentJourneyData } from './studentJourneyService';

jest.mock('../modules/documents/document.service', () => ({ getDocumentsForStudent: jest.fn(async () => ['doc']) }));
jest.mock('./applicationService', () => ({ getLatestStudentApplication: jest.fn(async () => ({ _id: 'app1' })) }));
jest.mock('./courseEquivalencyService', () => ({ getStudentRequests: jest.fn(async () => ['request']) }));
jest.mock('./resultService', () => ({ getStudentResults: jest.fn(async () => ['result']) }));
jest.mock('./visaService', () => ({ getStudentVisaProcess: jest.fn(async () => ({ status: 'approved' })) }));
jest.mock('../models/StudentProfile', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

const mockProfile = (profile: unknown) =>
  (StudentProfile.findOne as jest.Mock).mockReturnValue({ select: () => ({ lean: async () => profile }) });

describe('getStudentJourneyData', () => {
  it('returns every part of the journey in one response', async () => {
    mockProfile({ transcript: { fileUrl: '/uploads/t.pdf' } });

    await expect(getStudentJourneyData('student-1')).resolves.toEqual({
      application: { _id: 'app1' },
      requests: ['request'],
      documents: ['doc'],
      transcriptUploaded: true,
      visa: { status: 'approved' },
      results: ['result'],
    });
  });

  it('reports no transcript when the profile has none', async () => {
    mockProfile(null);

    await expect(getStudentJourneyData('student-1')).resolves.toMatchObject({ transcriptUploaded: false });
  });
});
