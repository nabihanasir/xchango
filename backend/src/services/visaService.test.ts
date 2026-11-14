import mongoose from 'mongoose';
import { updateVisaStatus } from './visaService';
import { assertJourneyReady } from './journeyGateService';
import Application from '../models/Application';
import Notification from '../models/Notification';
import User from '../models/User';
import VisaProcess, { VisaStatus } from '../models/VisaProcess';

jest.mock('./journeyGateService', () => ({ assertJourneyReady: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../models/User');
jest.mock('../models/Application');
jest.mock('../models/Notification');
jest.mock('../models/VisaProcess', () => {
  const actual = jest.requireActual('../models/VisaProcess');
  const MockVisaProcess: any = jest.fn().mockImplementation((doc) => ({
    ...doc,
    history: [],
    save: jest.fn().mockResolvedValue(undefined),
  }));
  MockVisaProcess.findOne = jest.fn();
  return { __esModule: true, ...actual, default: MockVisaProcess };
});

const MockedUser = User as jest.Mocked<typeof User>;
const MockedApplication = Application as jest.Mocked<typeof Application>;
const MockedNotification = Notification as jest.Mocked<typeof Notification>;
const MockedVisaProcess = VisaProcess as unknown as jest.Mock & { findOne: jest.Mock };

const adminId = new mongoose.Types.ObjectId().toString();
const studentId = new mongoose.Types.ObjectId().toString();

const givenStudentWithActiveApplication = () => {
  MockedUser.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: studentId }) } as never);
  MockedApplication.findOne.mockReturnValue({
    sort: jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId() }),
  } as never);
};

beforeEach(() => {
  jest.clearAllMocks();
  MockedVisaProcess.findOne.mockResolvedValue(null);
});

describe('updateVisaStatus', () => {
  it('rejects a malformed student id', async () => {
    await expect(
      updateVisaStatus(adminId, 'not-an-id', { status: VisaStatus.APPROVED })
    ).rejects.toMatchObject({ code: 'INVALID_STUDENT_ID', status: 400 });
  });

  it('rejects a status that is not part of the visa flow', async () => {
    await expect(updateVisaStatus(adminId, studentId, { status: 'teleported' })).rejects.toMatchObject({
      code: 'INVALID_VISA_STATUS',
      status: 400,
    });
    expect(MockedNotification.create).not.toHaveBeenCalled();
  });

  it('returns 404 when the id does not belong to a student', async () => {
    MockedUser.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) } as never);

    await expect(
      updateVisaStatus(adminId, studentId, { status: VisaStatus.UNDER_REVIEW })
    ).rejects.toMatchObject({ code: 'STUDENT_NOT_FOUND', status: 404 });
  });

  it('refuses students who have no active application', async () => {
    MockedUser.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: studentId }) } as never);
    MockedApplication.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) } as never);

    await expect(
      updateVisaStatus(adminId, studentId, { status: VisaStatus.UNDER_REVIEW })
    ).rejects.toMatchObject({ code: 'NO_ACTIVE_APPLICATION', status: 400 });
    expect(MockedVisaProcess).not.toHaveBeenCalled();
  });

  it('creates the record, logs history and notifies the student', async () => {
    givenStudentWithActiveApplication();

    const visa = await updateVisaStatus(adminId, studentId, {
      status: VisaStatus.DOCUMENTS_REQUIRED,
      remarks: '  Bring your passport copy  ',
    });

    expect(visa.status).toBe(VisaStatus.DOCUMENTS_REQUIRED);
    expect(visa.remarks).toBe('Bring your passport copy');
    expect(visa.history).toHaveLength(1);
    expect(visa.save).toHaveBeenCalledTimes(1);
    expect(MockedNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: visa.studentId,
        type: 'visa_status_updated',
        message: expect.stringContaining('Documents required'),
      })
    );
  });

  it('does not duplicate history or re-notify when nothing changed', async () => {
    givenStudentWithActiveApplication();
    const existing = { status: VisaStatus.UNDER_REVIEW, remarks: 'Embassy has it', save: jest.fn() };
    MockedVisaProcess.findOne.mockResolvedValue(existing);

    const visa = await updateVisaStatus(adminId, studentId, {
      status: VisaStatus.UNDER_REVIEW,
      remarks: 'Embassy has it',
    });

    expect(visa).toBe(existing);
    expect(existing.save).not.toHaveBeenCalled();
    expect(MockedNotification.create).not.toHaveBeenCalled();
  });

  it.each([VisaStatus.APPROVED, VisaStatus.REJECTED])('refuses any change once the visa is %s', async (finalStatus) => {
    givenStudentWithActiveApplication();
    const existing = { status: finalStatus, remarks: 'Done', save: jest.fn() };
    MockedVisaProcess.findOne.mockResolvedValue(existing);

    await expect(
      updateVisaStatus(adminId, studentId, { status: VisaStatus.UNDER_REVIEW, remarks: 'Changed my mind' })
    ).rejects.toMatchObject({ code: 'VISA_DECISION_FINAL', status: 400 });

    expect(existing.save).not.toHaveBeenCalled();
    expect(MockedNotification.create).not.toHaveBeenCalled();
  });

  it('refuses a visa update until the earlier journey steps are done', async () => {
    givenStudentWithActiveApplication();
    (assertJourneyReady as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('Visa is not available yet.'), { code: 'JOURNEY_STEP_LOCKED' })
    );

    await expect(updateVisaStatus(adminId, studentId, { status: VisaStatus.APPROVED })).rejects.toMatchObject({
      code: 'JOURNEY_STEP_LOCKED',
    });
    expect(assertJourneyReady).toHaveBeenCalledWith(studentId, 'visa');
    expect(MockedVisaProcess).not.toHaveBeenCalled();
    expect(MockedNotification.create).not.toHaveBeenCalled();
  });
});
