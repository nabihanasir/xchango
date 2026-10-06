import mongoose from 'mongoose';
import Application, { ApplicationStatus, IArrivalNotice } from '../models/Application';
import Course, { CourseType, ICourse } from '../models/Course';
import CourseRequest, { CourseRequestItemStatus } from '../models/CourseRequest';
import User, { UserRole } from '../models/User';
import { ForbiddenError, NotFoundError, ValidationError } from '../errors/AppError';
import { isEmailConfigured, sendEmail } from './emailService';
import { appUrl, formatDate, notifyUserSafely } from './notificationService';
import { getApplicationById } from './applicationService';

export interface ArrivalInput {
  arrivedAt?: string;
  /** Home-university courses the student keeps taking online while abroad. */
  onlineHomeCourseIds?: string[];
}

interface Actor {
  _id: string;
  role: UserRole;
}

/** A student can only arrive once they have been selected and before the exchange is closed. */
const ARRIVAL_STATUSES = [
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.COURSE_REQUEST_ENABLED,
  ApplicationStatus.DOCUMENT_PENDING,
  ApplicationStatus.COURSE_SELECTION_PENDING,
  ApplicationStatus.READY_FOR_SUBMISSION,
];

const courseLabel = (course: ICourse) => {
  const title = course.title || course.name || 'Untitled course';
  return course.code ? `${course.code} ${title}` : title;
};

/** Host courses the student is enrolled in: approved equivalency items plus approved application picks. */
const findEnrolledHostCourses = async (studentId: mongoose.Types.ObjectId, selected: mongoose.Types.ObjectId[]) => {
  const requests = await CourseRequest.find({ studentId });
  const ids = new Set(selected.map(String));

  for (const request of requests) {
    for (const item of request.items) {
      if (item.status === CourseRequestItemStatus.APPROVED) {
        ids.add(item.hostCourseId.toString());
      }
    }
  }

  if (!ids.size) {
    return [];
  }

  return Course.find({ _id: { $in: [...ids] }, type: CourseType.HOST });
};

const findOnlineHomeCourses = async (courseIds: string[]) => {
  const unique = [...new Set(courseIds.filter(Boolean))];
  if (unique.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw new ValidationError(
      'Invalid course selected.',
      'One of the selected home courses has an invalid identifier.',
      'Refresh the page and select the courses again.',
      'ARRIVAL_INVALID_COURSE'
    );
  }

  if (!unique.length) {
    return [];
  }

  const courses = await Course.find({
    _id: { $in: unique },
    $or: [{ isHomeCourse: true }, { type: CourseType.HOME }],
  });

  if (courses.length !== unique.length) {
    throw new ValidationError(
      'Invalid course selected.',
      'Only home-university courses can be marked as taken online.',
      'Select courses from the home course list.',
      'ARRIVAL_INVALID_COURSE'
    );
  }

  return courses;
};

/** One notice per instructor email, listing every course of theirs the student takes. */
const groupByInstructor = (courses: ICourse[], side: IArrivalNotice['side']) => {
  const notices = new Map<string, IArrivalNotice>();
  const missing: string[] = [];

  for (const course of courses) {
    const email = course.instructorEmail?.trim().toLowerCase();
    if (!email) {
      missing.push(courseLabel(course));
      continue;
    }

    const notice = notices.get(email) ?? { email, name: course.instructorName || '', courses: [], side, sent: false };
    notice.courses.push(courseLabel(course));
    notices.set(email, notice);
  }

  return { notices: [...notices.values()], missing };
};

const buildInstructorEmail = (
  notice: IArrivalNotice,
  student: { name: string; sapId?: string; email: string },
  university: string,
  arrivedAt: Date
) => {
  const studentLine = `${student.name}${student.sapId ? ` (SAP ID ${student.sapId})` : ''}`;
  const courseList = notice.courses.map((course) => `- ${course}`).join('\n');
  const greeting = `Dear ${notice.name || 'Instructor'},`;

  if (notice.side === 'host') {
    return {
      subject: `Exchange student arrived: ${student.name}`,
      text: `${greeting}\n\nThis is to let you know that our exchange student ${studentLine} arrived at ${university} on ${formatDate(arrivedAt)} and is enrolled in your course(s):\n\n${courseList}\n\nYou can reach the student at ${student.email}.\n\nThank you for welcoming them.`,
    };
  }

  return {
    subject: `Student taking your course online: ${student.name}`,
    text: `${greeting}\n\nOur student ${studentLine} arrived at ${university} for their exchange semester on ${formatDate(arrivedAt)}. They will continue the following course(s) online from abroad:\n\n${courseList}\n\nPlease share the online class access and any schedule changes with the student at ${student.email}.\n\nThank you.`,
  };
};

export const recordArrival = async (applicationId: string, actor: Actor, input: ArrivalInput) => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new ValidationError(
      'Invalid application.',
      'The application identifier is not valid.',
      'Refresh the page and try again.',
      'INVALID_APPLICATION_ID'
    );
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    throw new NotFoundError(
      'Application not found.',
      'No application exists for the provided identifier.',
      'Refresh the list and try again.',
      'APPLICATION_NOT_FOUND'
    );
  }

  if (actor.role === UserRole.ADVISOR && application.advisorId?.toString() !== actor._id) {
    throw new ForbiddenError(
      'You are not authorized to access this application.',
      'This application is not assigned to the current advisor.',
      'Open an application assigned to you or contact an administrator.',
      'ADVISOR_ACCESS_DENIED'
    );
  }

  if (application.arrival?.arrivedAt) {
    throw new ValidationError(
      'Arrival already recorded.',
      `The student's arrival was already recorded on ${formatDate(application.arrival.arrivedAt)}.`,
      'No further action is needed.',
      'ARRIVAL_ALREADY_RECORDED'
    );
  }

  if (!ARRIVAL_STATUSES.includes(application.status)) {
    throw new ValidationError(
      'Arrival cannot be recorded yet.',
      `Applications in status ${application.status} cannot be marked as arrived.`,
      'Only shortlisted students who have not completed their exchange can be marked as arrived.',
      'ARRIVAL_NOT_ALLOWED'
    );
  }

  const arrivedAt = input.arrivedAt ? new Date(input.arrivedAt) : new Date();
  if (Number.isNaN(arrivedAt.getTime()) || arrivedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw new ValidationError(
      'Invalid arrival date.',
      'The arrival date is missing, malformed, or in the future.',
      'Choose the date the student actually arrived.',
      'ARRIVAL_DATE_INVALID'
    );
  }

  const student = await User.findById(application.studentId).select('name email sapId');
  if (!student) {
    throw new NotFoundError(
      'Student not found.',
      'The student linked to this application no longer exists.',
      'Contact an administrator.',
      'STUDENT_NOT_FOUND'
    );
  }

  const approvedSelections = application.selectedCourses
    .filter((selection) => selection.status === 'approved')
    .map((selection) => selection.course);
  const homeCourses = await findOnlineHomeCourses(input.onlineHomeCourseIds ?? []);
  const hostCourses = await findEnrolledHostCourses(application.studentId, approvedSelections);

  const host = groupByInstructor(hostCourses, 'host');
  const home = groupByInstructor(homeCourses, 'home');
  const notices = [...host.notices, ...home.notices];

  // One email per instructor so recipients never see each other's addresses.
  await Promise.all(
    notices.map(async (notice) => {
      const message = buildInstructorEmail(notice, student, application.university, arrivedAt);
      notice.sent = await sendEmail({ to: notice.email, ...message });
    })
  );

  application.arrival = {
    arrivedAt,
    recordedAt: new Date(),
    recordedBy: new mongoose.Types.ObjectId(actor._id),
    onlineHomeCourses: homeCourses.map((course) => course._id as mongoose.Types.ObjectId),
    notices,
  };
  await application.save();

  await notifyUserSafely({
    userId: application.studentId,
    subject: 'Arrival confirmed',
    type: 'arrival_recorded',
    message: `Welcome to ${application.university}! Your arrival on ${formatDate(arrivedAt)} has been recorded${notices.length ? ' and your course instructors have been informed' : ''}.`,
    metadata: { applicationId: application._id, arrivedAt },
    action: { label: 'View application', url: appUrl(`/dashboard/applications/${application._id}`) },
  });

  return {
    application: await getApplicationById(applicationId, actor),
    emailConfigured: isEmailConfigured(),
    notices,
    coursesWithoutInstructorEmail: [...host.missing, ...home.missing],
  };
};
