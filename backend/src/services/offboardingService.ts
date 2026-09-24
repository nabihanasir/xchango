import Application, { ApplicationStatus } from '../models/Application';
import User, { UserRole } from '../models/User';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { logger } from '../utils/logger';

const CLOSED_STATUSES = [ApplicationStatus.COMPLETED, ApplicationStatus.REJECTED];
const NOT_ELIGIBLE_FOR_END_DATE = [ApplicationStatus.DRAFT, ...CLOSED_STATUSES];

/**
 * Completes every application whose semester has ended and off-boards the student
 * once none of their applications is still open. The account is kept (read-only),
 * never deleted. Pass `studentId` to limit the sweep to one student.
 */
export const offboardDueStudents = async (studentId?: string) => {
  const due = await Application.find({
    semesterEndDate: { $lte: new Date() },
    status: { $nin: CLOSED_STATUSES },
    ...(studentId ? { studentId } : {}),
  });

  const studentIds = new Set<string>();
  for (const application of due) {
    application.status = ApplicationStatus.COMPLETED;
    await application.save();
    studentIds.add(application.studentId.toString());
  }

  for (const id of studentIds) {
    const stillOpen = await Application.exists({
      studentId: id,
      status: { $nin: [...CLOSED_STATUSES, ApplicationStatus.DRAFT] },
    });
    if (stillOpen) continue;

    await User.updateOne(
      { _id: id, role: UserRole.STUDENT, offboardedAt: { $exists: false } },
      { $set: { offboardedAt: new Date() } },
    );
    logger.info('Student off-boarded', { studentId: id });
  }

  return studentIds.size;
};

export const setSemesterEndDate = async (applicationId: string, semesterEndDate: string | null) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new NotFoundError(
      'Application not found',
      'No application exists with the given id.',
      'Refresh the list and try again.',
      'APPLICATION_NOT_FOUND',
    );
  }

  if (NOT_ELIGIBLE_FOR_END_DATE.includes(application.status)) {
    throw new ValidationError(
      'Cannot set semester end date',
      `Applications in status ${application.status} cannot be scheduled for completion.`,
      'Set the end date on a submitted, in-progress application.',
      'SEMESTER_END_NOT_ALLOWED',
    );
  }

  const parsed = semesterEndDate ? new Date(semesterEndDate) : undefined;
  if (parsed && Number.isNaN(parsed.getTime())) {
    throw new ValidationError(
      'Invalid date',
      'The semester end date could not be parsed.',
      'Provide a valid date such as 2026-12-31.',
      'INVALID_SEMESTER_END_DATE',
    );
  }

  application.semesterEndDate = parsed;
  await application.save();

  // An end date of today or earlier takes effect immediately.
  await offboardDueStudents(application.studentId.toString());
  return Application.findById(applicationId);
};

export const reactivateStudent = async (userId: string) => {
  const user = await User.findOneAndUpdate(
    { _id: userId, role: UserRole.STUDENT },
    { $unset: { offboardedAt: 1 } },
    { new: true },
  ).select('-password');

  if (!user) {
    throw new NotFoundError(
      'Student not found',
      'No student account exists with the given id.',
      'Refresh the list and try again.',
      'STUDENT_NOT_FOUND',
    );
  }
  return user;
};
