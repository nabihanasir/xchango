import mongoose from 'mongoose';
import Application, { ApplicationStatus } from '../models/Application';
import Notification from '../models/Notification';
import {
  recordInterviewDecision,
  selectCourses,
  studentCanRequestCourseApproval,
  submitApplication,
} from './applicationService';

jest.mock('../models/User');
jest.mock('../models/Course');
jest.mock('../models/University');
jest.mock('../models/AdvisorProfile');
jest.mock('../models/Application');
jest.mock('../models/Notification');
jest.mock('./aiRecommendation.service', () => ({ getCourseRecommendations: jest.fn() }));
jest.mock('./studentService', () => ({
  ensureStudentProfile: jest.fn().mockResolvedValue({ isProfileComplete: true, profileCompletionIssues: [] }),
}));

const MockedApplication = Application as jest.Mocked<typeof Application>;
const MockedNotification = Notification as jest.Mocked<typeof Notification>;

const advisorId = new mongoose.Types.ObjectId().toString();
const studentId = new mongoose.Types.ObjectId().toString();
const applicationId = new mongoose.Types.ObjectId().toString();

const givenApplication = (overrides: Record<string, unknown> = {}) => {
  const application: any = {
    _id: applicationId,
    studentId,
    advisorId,
    status: ApplicationStatus.INTERVIEW_COMPLETED,
    documents: [],
    selectedCourses: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  // Resolves for both `await findById()` and the populate chain used when re-reading.
  const query: any = {
    populate: jest.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => resolve(application),
  };
  MockedApplication.findById.mockReturnValue(query as never);

  return application;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('recordInterviewDecision', () => {
  it('shortlists the student and notifies them when recommended', async () => {
    const application = givenApplication();

    await recordInterviewDecision(applicationId, advisorId, { recommended: true, notes: '  Strong interview  ' });

    expect(application.status).toBe(ApplicationStatus.SHORTLISTED);
    expect(application.interviewDecision).toMatchObject({ recommended: true, notes: 'Strong interview' });
    expect(application.save).toHaveBeenCalled();
    expect(MockedNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: studentId, type: 'interview_decision' })
    );
  });

  it('rejects the application and records the reason when not recommended', async () => {
    const application = givenApplication();

    await recordInterviewDecision(applicationId, advisorId, {
      recommended: false,
      notes: 'Credit history does not meet the requirement',
    });

    expect(application.status).toBe(ApplicationStatus.REJECTED);
    expect(application.interviewDecision).toMatchObject({
      recommended: false,
      notes: 'Credit history does not meet the requirement',
    });
  });

  it('requires a reason when not recommending', async () => {
    const application = givenApplication();

    await expect(
      recordInterviewDecision(applicationId, advisorId, { recommended: false, notes: '   ' })
    ).rejects.toMatchObject({ code: 'INTERVIEW_DECISION_NOTES_REQUIRED', status: 400 });

    expect(application.status).toBe(ApplicationStatus.INTERVIEW_COMPLETED);
    expect(application.save).not.toHaveBeenCalled();
  });

  it('only accepts a decision after the interview is completed', async () => {
    const application = givenApplication({ status: ApplicationStatus.INTERVIEW_SCHEDULED });

    await expect(
      recordInterviewDecision(applicationId, advisorId, { recommended: true })
    ).rejects.toMatchObject({ code: 'INTERVIEW_DECISION_NOT_ALLOWED' });

    expect(application.save).not.toHaveBeenCalled();
  });

  it('does not let a recorded decision be changed', async () => {
    const application = givenApplication({ status: ApplicationStatus.REJECTED });

    await expect(
      recordInterviewDecision(applicationId, advisorId, { recommended: true })
    ).rejects.toMatchObject({ code: 'INTERVIEW_DECISION_NOT_ALLOWED' });

    expect(application.status).toBe(ApplicationStatus.REJECTED);
  });

  it('refuses an advisor the application is not assigned to', async () => {
    givenApplication({ advisorId: new mongoose.Types.ObjectId().toString() });

    await expect(
      recordInterviewDecision(applicationId, advisorId, { recommended: true })
    ).rejects.toMatchObject({ code: 'ADVISOR_ACCESS_DENIED' });
  });

  it('still saves the decision when the notification fails', async () => {
    const application = givenApplication();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    MockedNotification.create.mockRejectedValueOnce(new Error('db down') as never);

    await recordInterviewDecision(applicationId, advisorId, { recommended: true });

    expect(application.status).toBe(ApplicationStatus.SHORTLISTED);
    consoleError.mockRestore();
  });
});

describe('gates that depend on the advisor recommendation', () => {
  it('does not let a student request courses while the decision is pending', async () => {
    givenApplication({ status: ApplicationStatus.INTERVIEW_COMPLETED });

    await expect(selectCourses(applicationId, studentId, [])).rejects.toMatchObject({
      code: 'INTERVIEW_NOT_COMPLETED',
    });
  });

  it('does not let a not-recommended student request courses', async () => {
    givenApplication({ status: ApplicationStatus.REJECTED });

    await expect(selectCourses(applicationId, studentId, [])).rejects.toMatchObject({
      code: 'INTERVIEW_NOT_COMPLETED',
    });
  });

  it('does not treat a completed interview as clearance for course approval', async () => {
    MockedApplication.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) } as never);

    await studentCanRequestCourseApproval(studentId);

    const filter = MockedApplication.findOne.mock.calls[0][0] as unknown as { status: { $in: string[] } };
    expect(filter.status.$in).not.toContain(ApplicationStatus.INTERVIEW_COMPLETED);
    expect(filter.status.$in).toContain(ApplicationStatus.SHORTLISTED);
    expect(filter.status.$in).not.toContain(ApplicationStatus.REJECTED);
  });

  it('does not let a not-recommended student resubmit the application', async () => {
    const application = givenApplication({ status: ApplicationStatus.REJECTED });

    await expect(submitApplication(applicationId, studentId)).rejects.toMatchObject({
      code: 'APPLICATION_ALREADY_SUBMITTED',
    });

    expect(application.status).toBe(ApplicationStatus.REJECTED);
    expect(application.save).not.toHaveBeenCalled();
  });
});
