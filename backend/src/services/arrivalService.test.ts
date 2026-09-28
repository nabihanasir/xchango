import mongoose from 'mongoose';
import Application, { ApplicationStatus } from '../models/Application';
import Course from '../models/Course';
import CourseRequest from '../models/CourseRequest';
import User, { UserRole } from '../models/User';
import { sendEmail } from './emailService';
import { notifyUserSafely } from './notificationService';
import { recordArrival } from './arrivalService';

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
