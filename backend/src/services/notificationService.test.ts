import Notification from '../models/Notification';
import User from '../models/User';
import { isEmailConfigured, sendEmail } from './emailService';
import { notifyUser, notifyUserSafely } from './notificationService';

jest.mock('../models/Notification');
jest.mock('../models/User');
jest.mock('./emailService', () => ({
  isEmailConfigured: jest.fn(),
  sendEmail: jest.fn(),
}));
jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const MockedNotification = Notification as jest.Mocked<typeof Notification>;
const MockedUser = User as jest.Mocked<typeof User>;
const mockedIsEmailConfigured = isEmailConfigured as jest.Mock;
const mockedSendEmail = sendEmail as jest.Mock;

const flushBackgroundWork = () => new Promise((resolve) => setImmediate(resolve));

const input = {
  userId: 'user-1',
  subject: 'Visa process update',
  type: 'visa_status_updated',
  message: 'Your visa was approved.',
};

beforeEach(() => {
  jest.clearAllMocks();
  MockedNotification.create.mockResolvedValue({ _id: 'notification-1' } as never);
  MockedUser.findById.mockReturnValue({
    select: jest.fn().mockResolvedValue({ email: 'student@example.com', name: 'Sara' }),
  } as never);
});

describe('notifyUser', () => {
  it('stores the notification and emails the user when email is set up', async () => {
    mockedIsEmailConfigured.mockReturnValue(true);
    mockedSendEmail.mockResolvedValue(true);

    await notifyUser(input);
    await flushBackgroundWork();

    expect(MockedNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({ channels: { inApp: true, email: true }, emailStatus: 'queued' })
    );
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'student@example.com',
        subject: 'Visa process update',
        text: expect.stringContaining('Hi Sara'),
      })
    );
    expect(MockedNotification.updateOne).toHaveBeenCalledWith({ _id: 'notification-1' }, { emailStatus: 'sent' });
  });

  it('marks the email as failed when the mail server rejects it', async () => {
    mockedIsEmailConfigured.mockReturnValue(true);
    mockedSendEmail.mockResolvedValue(false);

    await notifyUser(input);
    await flushBackgroundWork();

    expect(MockedNotification.updateOne).toHaveBeenCalledWith({ _id: 'notification-1' }, { emailStatus: 'failed' });
  });

  it('skips email when SMTP is not configured', async () => {
    mockedIsEmailConfigured.mockReturnValue(false);

    await notifyUser(input);
    await flushBackgroundWork();

    expect(MockedNotification.create).toHaveBeenCalled();
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it('only creates an in-app notification when email is not requested', async () => {
    mockedIsEmailConfigured.mockReturnValue(true);

    await notifyUser({ ...input, email: false });
    await flushBackgroundWork();

    expect(MockedNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({ channels: { inApp: true, email: false }, emailStatus: 'not_requested' })
    );
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });
});

describe('notifyUserSafely', () => {
  it('swallows storage errors so the calling action still succeeds', async () => {
    MockedNotification.create.mockRejectedValueOnce(new Error('db down') as never);

    await expect(notifyUserSafely(input)).resolves.toBeNull();
  });
});
