import bcrypt from 'bcryptjs';
import Application, { ApplicationStatus } from '../models/Application';
import User, { UserRole } from '../models/User';
import { AuthenticationError, ForbiddenError, NotFoundError, ValidationError } from '../errors/AppError';
import { assertObjectId } from '../utils/validators';
import StudentProfile from '../models/StudentProfile';
import ProgramOutline from '../models/ProgramOutline';
import CourseRequest from '../models/CourseRequest';
import ExamVerification from '../models/ExamVerification';
import Result from '../models/Result';
import VisaProcess from '../models/VisaProcess';
import Notification from '../models/Notification';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import AdvisorProfile from '../models/AdvisorProfile';
import { deleteStoredFile } from '../utils/storedFiles';

const CLOSED_STATUSES = [ApplicationStatus.COMPLETED, ApplicationStatus.REJECTED];

/** Frees the advisor's slots held by this student's pending or confirmed interview requests. */
const releaseInterviewSlots = async (studentId: string) => {
  const applications = await Application.find({
    studentId,
    'interviewRequest.status': { $in: ['requested', 'accepted'] },
  });
  for (const application of applications) {
    const request = application.interviewRequest;
    if (!request) continue;
    const confirmed = request.status === 'accepted';
    application.interviewRequest = {
      start: request.start,
      durationMinutes: request.durationMinutes,
      requestedAt: request.requestedAt,
      status: 'cancelled',
      respondedAt: new Date(),
      cancelledBy: 'student',
      cancelReason: 'other',
      cancelDetails: 'Account deactivated',
    };
    if (confirmed) {
      application.interview = undefined;
      application.interviewDate = undefined;
      application.status = ApplicationStatus.ASSIGNED;
    }
    await application.save();
  }
};

const deactivate = async (userId: string, by: 'self' | 'admin') => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found', 'No account exists with the given id.', 'Refresh the list and try again.', 'USER_NOT_FOUND');
  }
  if (user.role === UserRole.ADMIN) {
    throw new ForbiddenError(
      'Admin accounts cannot be deactivated.',
      'Deactivating an administrator could lock everyone out of the system.',
      'Ask another administrator to change your role first.',
      'ADMIN_DEACTIVATION_BLOCKED',
    );
  }
  if (user.isActive === false) {
    return user;
  }

  if (user.role === UserRole.ADVISOR && by === 'self') {
    const openStudents = await Application.countDocuments({
      advisorId: user._id,
      status: { $nin: [...CLOSED_STATUSES, ApplicationStatus.DRAFT] },
    });
    if (openStudents > 0) {
      throw new ValidationError(
        'You still have students in progress.',
        `${openStudents} application${openStudents === 1 ? ' is' : 's are'} currently assigned to you.`,
        'Ask an administrator to reassign your students or deactivate the account for you.',
        'ADVISOR_HAS_OPEN_APPLICATIONS',
      );
    }
  }

  user.isActive = false;
  user.deactivatedAt = new Date();
  user.deactivatedBy = by;
  await user.save();

  if (user.role === UserRole.STUDENT) {
    await releaseInterviewSlots(user._id.toString());
  }
  return user;
};

/** A user deactivates their own account after confirming their password. */
export const deactivateOwnAccount = async (userId: string, input: { password?: unknown }) => {
  const password = typeof input?.password === 'string' ? input.password : '';
  if (!password) {
    throw new ValidationError(
      'Password required.',
      'Enter your current password to deactivate your account.',
      'Type your password and try again.',
      'PASSWORD_REQUIRED',
    );
  }
  const user = await User.findById(userId);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AuthenticationError(
      'Incorrect password.',
      'The password you entered does not match your account.',
      'Check your password and try again.',
      'PASSWORD_INCORRECT',
    );
  }
  await deactivate(userId, 'self');
  return { deactivated: true };
};

export const deactivateUserByAdmin = async (targetId: string) => {
  assertObjectId(targetId, 'User', 'INVALID_USER_ID');
  const user = await deactivate(targetId, 'admin');
  return { _id: user._id, isActive: user.isActive, deactivatedAt: user.deactivatedAt, deactivatedBy: user.deactivatedBy };
};

export const activateUser = async (targetId: string) => {
  assertObjectId(targetId, 'User', 'INVALID_USER_ID');
  const user = await User.findByIdAndUpdate(
    targetId,
    { $set: { isActive: true }, $unset: { deactivatedAt: 1, deactivatedBy: 1 } },
    { new: true },
  ).select('-password');
  if (!user) {
    throw new NotFoundError('User not found', 'No account exists with the given id.', 'Refresh the list and try again.', 'USER_NOT_FOUND');
  }
  return user;
};

/**
 * Permanently deletes a student's account and everything linked to it: applications (which also frees any
 * interview slots they held), profile, transcript and outline files, course requests, results, visa record,
 * notifications and chat messages. Needs the password and the word DELETE. Cannot be undone.
 */
export const deleteOwnStudentAccount = async (userId: string, input: { password?: unknown; confirm?: unknown }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found', 'No account exists with the given id.', 'Sign in again.', 'USER_NOT_FOUND');
  }
  if (user.role !== UserRole.STUDENT) {
    throw new ForbiddenError(
      'Only students can delete their account here.',
      'Advisor and admin accounts are removed by an administrator.',
      'Ask an administrator, or deactivate your account instead.',
      'ACCOUNT_DELETE_NOT_ALLOWED',
    );
  }
  if (input?.confirm !== 'DELETE') {
    throw new ValidationError(
      'Confirmation required.',
      'Type DELETE to confirm that you want to permanently delete your account.',
      'Type DELETE exactly as shown and try again.',
      'DELETE_CONFIRMATION_REQUIRED',
    );
  }
  const password = typeof input?.password === 'string' ? input.password : '';
  if (!password || !(await bcrypt.compare(password, user.password))) {
    throw new AuthenticationError(
      'Incorrect password.',
      'The password you entered does not match your account.',
      'Check your password and try again.',
      'PASSWORD_INCORRECT',
    );
  }

  const [applications, profile, outline, requests] = await Promise.all([
    Application.find({ studentId: userId }).select('documents'),
    StudentProfile.findOne({ userId }).select('transcript'),
    ProgramOutline.findOne({ studentId: userId }).select('fileUrl'),
    CourseRequest.find({ studentId: userId }).select('items'),
  ]);
  const fileUrls = [
    ...applications.flatMap((application) => application.documents.map((document) => document.fileUrl)),
    profile?.transcript?.fileUrl,
    outline?.fileUrl,
    ...requests.flatMap((request) => request.items.map((item) => item.uploadedOutline?.fileUrl)),
  ];

  const conversations = await Conversation.find({ participants: userId }).select('_id');
  const conversationIds = conversations.map((conversation) => conversation._id);

  await Promise.all([
    Application.deleteMany({ studentId: userId }),
    StudentProfile.deleteMany({ userId }),
    ProgramOutline.deleteMany({ studentId: userId }),
    CourseRequest.deleteMany({ studentId: userId }),
    ExamVerification.deleteMany({ studentId: userId }),
    Result.deleteMany({ studentId: userId }),
    VisaProcess.deleteMany({ studentId: userId }),
    Notification.deleteMany({ userId }),
    Message.deleteMany({ conversation: { $in: conversationIds } }),
    Conversation.deleteMany({ _id: { $in: conversationIds } }),
    AdvisorProfile.updateMany({ assignedStudents: userId }, { $pull: { assignedStudents: userId } }),
  ]);
  await User.deleteOne({ _id: userId });
  await Promise.all(fileUrls.filter(Boolean).map((url) => deleteStoredFile(url)));

  return { deleted: true };
};
