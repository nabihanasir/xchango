import ExamVerification from '../models/ExamVerification';
import { assertVerificationDocumentUploaded } from './resultService';

jest.mock('../models/ExamVerification');
jest.mock('../models/AdvisorProfile');
jest.mock('../models/Application', () => ({ __esModule: true, default: {}, ApplicationStatus: {} }));
jest.mock('../models/CourseRequest', () => ({ __esModule: true, default: {}, CourseRequestItemStatus: {} }));
jest.mock('../models/Result', () => ({ __esModule: true, default: {}, ResultStatus: { PUBLISHED: 'published' } }));
jest.mock('./notificationService', () => ({ appUrl: jest.fn(), notifyUser: jest.fn() }));
jest.mock('./examVerificationService', () => ({ advisorCanReviewStudent: jest.fn() }));
jest.mock('./journeyGateService', () => ({ assertJourneyReady: jest.fn() }));

describe('assertVerificationDocumentUploaded', () => {
  it('blocks grading when the student has no usable document', async () => {
    (ExamVerification.exists as jest.Mock).mockResolvedValue(null);
    await expect(assertVerificationDocumentUploaded('student-1')).rejects.toMatchObject({ code: 'RESULT_DOCUMENT_MISSING' });
    expect(ExamVerification.exists).toHaveBeenCalledWith({
      studentId: 'student-1',
      status: { $in: ['submitted', 'verified'] },
    });
  });

  it('allows grading once a document is submitted or verified', async () => {
    (ExamVerification.exists as jest.Mock).mockResolvedValue({ _id: 'v1' });
    await expect(assertVerificationDocumentUploaded('student-1')).resolves.toBeUndefined();
  });
});
