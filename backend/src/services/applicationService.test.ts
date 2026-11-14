import mongoose from 'mongoose';
import Application, { ApplicationStatus } from '../models/Application';
import AdvisorProfile from '../models/AdvisorProfile';
import Notification from '../models/Notification';
import User from '../models/User';
import {
  createApplication,
  findAdvisorForApplication,
  recordInterviewDecision,
  selectCourses,
  studentCanRequestCourseApproval,
  submitApplication,
} from './applicationService';
import { findSemesterContaining } from './semesterService';

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

jest.mock('./semesterService', () => ({ findSemesterContaining: jest.fn() }));

const mockedFindSemester = findSemesterContaining as jest.MockedFunction<typeof findSemesterContaining>;
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

describe('findAdvisorForApplication', () => {
  const advisorA = { _id: new mongoose.Types.ObjectId(), name: 'Alice Advisor' };
  const advisorB = { _id: new mongoose.Types.ObjectId(), name: 'Bob Advisor' };
  const application = { studentId, country: 'Malaysia' } as any;

  const givenAdvisors = (advisors: unknown[]) => {
    (AdvisorProfile.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(advisors.map((advisor: any) => ({ userId: advisor._id }))),
    });
    (User.find as jest.Mock).mockResolvedValue(advisors);
  };

  beforeEach(() => {
    (MockedApplication.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
  });

  it('returns null when no advisor supervises the country', async () => {
    givenAdvisors([]);

    await expect(findAdvisorForApplication(application)).resolves.toBeNull();
  });

  it('picks the advisor with the fewest open applications', async () => {
    givenAdvisors([advisorA, advisorB]);
    (MockedApplication.countDocuments as jest.Mock).mockImplementation(async (filter: any) =>
      String(filter.advisorId) === String(advisorA._id) ? 5 : 2
    );

    await expect(findAdvisorForApplication(application)).resolves.toBe(advisorB);
  });

  it('keeps the advisor the student already has for that country', async () => {
    givenAdvisors([advisorA, advisorB]);
    (MockedApplication.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ advisorId: advisorA._id }),
    });
    (MockedApplication.countDocuments as jest.Mock).mockResolvedValue(9);

    await expect(findAdvisorForApplication(application)).resolves.toBe(advisorA);
  });
});

describe('createApplication', () => {
  const payload = { country: 'Germany', university: 'TU Berlin', program: 'CS' };

  it('refuses a new application while another one is still open', async () => {
    (MockedApplication.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ university: 'TU Munich', status: ApplicationStatus.ASSIGNED }),
    });

    await expect(createApplication(studentId, payload)).rejects.toMatchObject({ code: 'ACTIVE_APPLICATION_EXISTS' });

    const filter = (MockedApplication.findOne as jest.Mock).mock.calls[0][0];
    expect(filter.status.$nin).toEqual([ApplicationStatus.REJECTED, ApplicationStatus.COMPLETED]);
    expect(MockedApplication.create).not.toHaveBeenCalled();
  });

  it('treats an unfinished draft as active too', async () => {
    (MockedApplication.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ university: 'TU Munich', status: ApplicationStatus.DRAFT }),
    });

    await expect(createApplication(studentId, payload)).rejects.toMatchObject({ code: 'ACTIVE_APPLICATION_EXISTS' });
  });

  describe('after an earlier application closed', () => {
    const givenClosedApplication = () => {
      (MockedApplication.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      (MockedApplication.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ status: ApplicationStatus.REJECTED, updatedAt: new Date('2026-10-01') }]),
        }),
      });
    };

    it('blocks a new application until the semester it closed in has ended', async () => {
      givenClosedApplication();
      mockedFindSemester.mockResolvedValue({ name: 'Fall 2026', endDate: new Date(Date.now() + 86_400_000) } as never);

      await expect(createApplication(studentId, payload)).rejects.toMatchObject({ code: 'APPLICATION_SEMESTER_LOCKED' });
      expect(MockedApplication.create).not.toHaveBeenCalled();
    });

    it('does not block once that semester is over', async () => {
      givenClosedApplication();
      mockedFindSemester.mockResolvedValue({ name: 'Spring 2026', endDate: new Date(Date.now() - 86_400_000) } as never);

      // Passing the lock moves on to payload validation, which fails fast on an empty country.
      await expect(createApplication(studentId, { country: '', university: '', program: '' })).rejects.toMatchObject({
        code: 'COUNTRY_REQUIRED',
      });
    });
  });
});
