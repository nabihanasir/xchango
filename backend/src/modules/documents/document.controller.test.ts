import { ForbiddenError, ValidationError } from '../../errors/AppError';
import { UserRole } from '../../models/User';
import { uploadDocument } from './document.controller';
import { assertJourneyReady } from '../../services/journeyGateService';
import { createDocument } from './document.service';

jest.mock('./document.service', () => ({
  createDocument: jest.fn(async (input: Record<string, unknown>) => ({ _id: 'doc1', ...input })),
  deleteDocument: jest.fn(),
  getDocumentById: jest.fn(),
  getDocumentsForStudent: jest.fn(),
  updateDocumentStatus: jest.fn(),
}));
jest.mock('../../services/applicationService', () => ({ advisorCanAccessStudent: jest.fn() }));
jest.mock('../../utils/upload', () => ({ toPublicFileUrl: (path: string) => `/uploads/${path}` }));
jest.mock('../../services/journeyGateService', () => ({ assertJourneyReady: jest.fn() }));

const file = { path: 'documents/cv.pdf', originalname: 'cv.pdf' };
const createMock = createDocument as jest.Mock;
const gateMock = assertJourneyReady as jest.Mock;

const makeReq = (role: UserRole, userId: string, body: Record<string, unknown>) => ({
  user: { _id: userId, role },
  file,
  body,
});

const makeRes = () => {
  const res: any = { locals: {} };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('uploadDocument access rules', () => {
  beforeEach(() => {
    createMock.mockClear();
    gateMock.mockReset();
  });

  it('refuses a student document before the Documents step opens', async () => {
    gateMock.mockRejectedValueOnce(new ValidationError('Documents is not available yet.', 'x', 'y', 'JOURNEY_STEP_LOCKED'));

    await expect(
      uploadDocument(makeReq(UserRole.STUDENT, 'student-1', { type: 'cv' }), makeRes())
    ).rejects.toMatchObject({ code: 'JOURNEY_STEP_LOCKED' });
    expect(gateMock).toHaveBeenCalledWith('student-1', 'documents');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('does not hold back the transcript, which course approval needs earlier', async () => {
    await uploadDocument(makeReq(UserRole.STUDENT, 'student-1', { type: 'transcript' }), makeRes());

    expect(gateMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalled();
  });

  it('lets a student upload to their own account', async () => {
    const res = makeRes();
    await uploadDocument(makeReq(UserRole.STUDENT, 'student-1', { studentId: 'student-1', type: 'transcript' }), res);

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ studentId: 'student-1', type: 'transcript' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('uses the signed-in student when no studentId is sent', async () => {
    await uploadDocument(makeReq(UserRole.STUDENT, 'student-1', { type: 'cv' }), makeRes());

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ studentId: 'student-1' }));
  });

  it('stops a student from uploading to another student', async () => {
    await expect(
      uploadDocument(makeReq(UserRole.STUDENT, 'student-1', { studentId: 'student-2', type: 'transcript' }), makeRes())
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('lets an admin upload for any student', async () => {
    await uploadDocument(makeReq(UserRole.ADMIN, 'admin-1', { studentId: 'student-2', type: 'passport' }), makeRes());

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ studentId: 'student-2' }));
  });

  it('does not let an advisor upload student documents', async () => {
    await expect(
      uploadDocument(makeReq(UserRole.ADVISOR, 'advisor-1', { studentId: 'student-2', type: 'cv' }), makeRes())
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(createMock).not.toHaveBeenCalled();
  });
});
