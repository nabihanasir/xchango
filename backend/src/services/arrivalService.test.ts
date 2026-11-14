import mongoose from 'mongoose';
import Application, { ApplicationStatus } from '../models/Application';
import Course from '../models/Course';
import CourseRequest from '../models/CourseRequest';
import User, { UserRole } from '../models/User';
import { sendEmail } from './emailService';
import { notifyUserSafely } from './notificationService';
import { recordArrival, reportArrival } from './arrivalService';
import { assertJourneyReady } from './journeyGateService';

jest.mock('./journeyGateService', () => ({ assertJourneyReady: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../models/Application');
jest.mock('../models/Course');
jest.mock('../models/CourseRequest');
jest.mock('../models/User');
jest.mock('./emailService', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(true),
  sendEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('./notificationService', () => ({
  ...jest.requireActual('./notificationService'),
  notifyUserSafely: jest.fn(),
}));
jest.mock('./applicationService', () => ({
  getApplicationById: jest.fn().mockResolvedValue({ populated: true }),
}));

const MockedApplication = Application as jest.Mocked<typeof Application>;
const MockedCourse = Course as jest.Mocked<typeof Course>;
const MockedCourseRequest = CourseRequest as jest.Mocked<typeof CourseRequest>;
const MockedUser = User as jest.Mocked<typeof User>;
const mockedSendEmail = sendEmail as jest.Mock;

const advisorId = new mongoose.Types.ObjectId().toString();
const studentId = new mongoose.Types.ObjectId();
const applicationId = new mongoose.Types.ObjectId().toString();
const homeCourseId = new mongoose.Types.ObjectId().toString();
const advisor = { _id: advisorId, role: UserRole.ADVISOR };

const course = (overrides: Record<string, unknown>) => ({
  _id: new mongoose.Types.ObjectId(),
  title: 'Course',
  code: '',
  instructorName: '',
  instructorEmail: '',
  ...overrides,
});

const givenApplication = (overrides: Record<string, unknown> = {}) => {
  const application: any = {
    _id: applicationId,
    studentId,
    advisorId: new mongoose.Types.ObjectId(advisorId),
    university: 'Uppsala University',
    status: ApplicationStatus.READY_FOR_SUBMISSION,
    selectedCourses: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  MockedApplication.findById.mockResolvedValue(application as never);
  return application;
};

beforeEach(() => {
  jest.clearAllMocks();
  MockedUser.findById.mockReturnValue({
    select: jest.fn().mockResolvedValue({ name: 'Sara Khan', sapId: '70001234', email: 'sara@student.edu' }),
  } as never);
  MockedCourseRequest.find.mockResolvedValue([
    {
      items: [
        { status: 'approved', hostCourseId: new mongoose.Types.ObjectId() },
        { status: 'rejected', hostCourseId: new mongoose.Types.ObjectId() },
      ],
    },
  ] as never);
});

describe('recordArrival', () => {
  it('emails host and home instructors once each and records who was told', async () => {
    const application = givenApplication();
    const hostCourses = [
      course({ title: 'Databases', code: 'DB1', instructorName: 'Dr. Lind', instructorEmail: 'lind@uu.se' }),
      course({ title: 'Networks', code: 'NW2', instructorName: 'Dr. Lind', instructorEmail: 'LIND@uu.se' }),
      course({ title: 'Ethics', code: 'ET3' }),
    ];
    const homeCourses = [course({ title: 'Formal Methods', instructorEmail: 'ayesha@home.edu' })];
    MockedCourse.find.mockResolvedValueOnce(homeCourses as never).mockResolvedValueOnce(hostCourses as never);

    const result = await recordArrival(applicationId, advisor, {
      arrivedAt: '2026-09-01',
      onlineHomeCourseIds: [homeCourseId],
    });

    expect(mockedSendEmail).toHaveBeenCalledTimes(2);
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'lind@uu.se',
        subject: 'Exchange student arrived: Sara Khan',
        text: expect.stringMatching(/DB1 Databases[\s\S]*NW2 Networks/),
      })
    );
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ayesha@home.edu', text: expect.stringContaining('online') })
    );
    expect(result.coursesWithoutInstructorEmail).toEqual(['ET3 Ethics']);
    expect(application.arrival.notices).toEqual([
      expect.objectContaining({ email: 'lind@uu.se', side: 'host', sent: true }),
      expect.objectContaining({ email: 'ayesha@home.edu', side: 'home', sent: true }),
    ]);
    expect(application.save).toHaveBeenCalled();
    expect(notifyUserSafely).toHaveBeenCalledWith(expect.objectContaining({ type: 'arrival_recorded' }));
  });

  it('refuses to record the arrival twice', async () => {
    givenApplication({ arrival: { arrivedAt: new Date('2026-09-01') } });

    await expect(recordArrival(applicationId, advisor, {})).rejects.toMatchObject({
      code: 'ARRIVAL_ALREADY_RECORDED',
    });
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it('refuses students who have not been shortlisted', async () => {
    givenApplication({ status: ApplicationStatus.INTERVIEW_SCHEDULED });

    await expect(recordArrival(applicationId, advisor, {})).rejects.toMatchObject({
      code: 'ARRIVAL_NOT_ALLOWED',
    });
  });

  it('refuses an advisor the application is not assigned to', async () => {
    givenApplication({ advisorId: new mongoose.Types.ObjectId() });

    await expect(recordArrival(applicationId, advisor, {})).rejects.toMatchObject({
      code: 'ADVISOR_ACCESS_DENIED',
    });
  });

  it('only accepts home courses as online courses', async () => {
    givenApplication();
    MockedCourse.find.mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);

    await expect(
      recordArrival(applicationId, advisor, { onlineHomeCourseIds: [homeCourseId] })
    ).rejects.toMatchObject({ code: 'ARRIVAL_INVALID_COURSE' });
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });
});

describe('reportArrival', () => {
  const studentIdString = studentId.toString();

  it('stores the report and notifies the assigned advisor without recording the arrival', async () => {
    const application = givenApplication({ status: ApplicationStatus.SHORTLISTED });
    MockedUser.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: 'Sara Khan' }) } as never);

    const result = await reportArrival(applicationId, studentIdString);

    expect(application.arrivalReport.reportedAt).toBeInstanceOf(Date);
    expect(application.arrival).toBeUndefined();
    expect(application.save).toHaveBeenCalled();
    expect(result.reportedAt).toBe(application.arrivalReport.reportedAt);
    expect(notifyUserSafely).toHaveBeenCalledWith(
      expect.objectContaining({ userId: application.advisorId, type: 'arrival_reported' })
    );
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it('rejects another student, a repeat report, a recorded arrival and an early report', async () => {
    givenApplication({ status: ApplicationStatus.SHORTLISTED });
    await expect(reportArrival(applicationId, new mongoose.Types.ObjectId().toString())).rejects.toMatchObject({
      code: 'APPLICATION_ACCESS_DENIED',
    });

    givenApplication({ status: ApplicationStatus.SHORTLISTED, arrivalReport: { reportedAt: new Date() } });
    await expect(reportArrival(applicationId, studentIdString)).rejects.toMatchObject({ code: 'ARRIVAL_ALREADY_REPORTED' });

    givenApplication({ status: ApplicationStatus.SHORTLISTED, arrival: { arrivedAt: new Date() } });
    await expect(reportArrival(applicationId, studentIdString)).rejects.toMatchObject({ code: 'ARRIVAL_ALREADY_RECORDED' });

    givenApplication({ status: ApplicationStatus.PENDING });
    await expect(reportArrival(applicationId, studentIdString)).rejects.toMatchObject({ code: 'ARRIVAL_NOT_ALLOWED' });
  });
});

describe('arrival gating', () => {
  const blocked = Object.assign(new Error('Arrival is not available yet.'), { code: 'JOURNEY_STEP_LOCKED' });

  it('refuses to record an arrival until the earlier steps are done', async () => {
    const application = givenApplication();
    (assertJourneyReady as jest.Mock).mockRejectedValueOnce(blocked);

    await expect(recordArrival(applicationId, advisor, { arrivedAt: '2026-09-01' })).rejects.toMatchObject({
      code: 'JOURNEY_STEP_LOCKED',
    });
    expect(assertJourneyReady).toHaveBeenCalledWith(String(application.studentId), 'arrival');
    expect(application.save).not.toHaveBeenCalled();
  });

  it('refuses a student arrival report until the earlier steps are done', async () => {
    const application = givenApplication();
    (assertJourneyReady as jest.Mock).mockRejectedValueOnce(blocked);

    await expect(reportArrival(applicationId, String(application.studentId))).rejects.toMatchObject({
      code: 'JOURNEY_STEP_LOCKED',
    });
    expect(application.save).not.toHaveBeenCalled();
  });
});
