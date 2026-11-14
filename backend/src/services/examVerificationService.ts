import mongoose from 'mongoose';
import { ForbiddenError, NotFoundError, ValidationError } from '../errors/AppError';
import AdvisorProfile from '../models/AdvisorProfile';
import Application, { ApplicationStatus, IApplication } from '../models/Application';
import ExamVerification, { ExamVerificationStatus } from '../models/ExamVerification';
import { deleteStoredFile } from '../utils/storedFiles';
import { appUrl, notifyAdmins, notifyUserSafely } from './notificationService';
import { MAX_COMMENT_LENGTH, assertObjectId, readString } from '../utils/validators';

/** The exchange the student is returning from: their latest application that got past the draft stage. */
export const findStudentExchange = async (studentId: string): Promise<IApplication | null> =>
  Application.findOne({
    studentId,
    status: { $nin: [ApplicationStatus.DRAFT, ApplicationStatus.REJECTED] },
  }).sort({ updatedAt: -1 });

export const getStudentVerification = async (studentId: string) => {
  const application = await findStudentExchange(studentId);
  if (!application) {
    return { application: null, verification: null };
  }

  const verification = await ExamVerification.findOne({ applicationId: application._id });
  return {
    application: {
      _id: application._id,
      country: application.country,
      university: application.university,
      program: application.program,
    },
    verification,
  };
};

export const submitVerification = async (
  studentId: string,
  input: { fileUrl: string; fileName: string; note?: string }
) => {
  try {
    readString(input.note, 'Note', { max: MAX_COMMENT_LENGTH });
  } catch (error) {
    await deleteStoredFile(input.fileUrl);
    throw error;
  }
  const application = await findStudentExchange(studentId);
  if (!application) {
    throw new ValidationError(
      'No exchange application found.',
      'You need a submitted exchange application before uploading a verification document.',
      'Complete your exchange application first.',
      'EXCHANGE_NOT_FOUND'
    );
  }

  const existing = await ExamVerification.findOne({ applicationId: application._id });
  if (existing?.status === ExamVerificationStatus.VERIFIED) {
    await deleteStoredFile(input.fileUrl);
    throw new ValidationError(
      'Your document is already verified.',
      'An advisor has already verified the document for this exchange.',
      'Contact your advisor if something needs to change.',
      'EXAM_VERIFICATION_LOCKED'
    );
  }

  const fields = {
    studentId,
    country: application.country,
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    note: input.note || '',
    status: ExamVerificationStatus.SUBMITTED,
    returnReason: '',
    reviewedBy: null,
    reviewedAt: null,
    submittedAt: new Date(),
  };

  if (existing) {
    // A replacement supersedes the previous file, so the old one is no longer needed.
    await deleteStoredFile(existing.fileUrl);
    Object.assign(existing, fields);
    await existing.save();
  } else {
    await ExamVerification.create({ ...fields, applicationId: application._id });
  }

  await notifyAdvisorsOfSubmission(application, studentId);
  return ExamVerification.findOne({ applicationId: application._id });
};

/** Advisors who can review a country: its supervisors plus whoever the application was assigned to. */
const advisorIdsForApplication = async (application: IApplication) => {
  const profiles = await AdvisorProfile.find({ countries: application.country }).select('userId');
  const ids = new Set(profiles.map((profile) => profile.userId.toString()));
  if (application.advisorId) {
    ids.add(application.advisorId.toString());
  }
  return [...ids];
};

const notifyAdvisorsOfSubmission = async (application: IApplication, studentId: string) => {
  const advisorIds = await advisorIdsForApplication(application);
  await notifyAdmins({
    subject: 'Verification document submitted',
    type: 'exam_verification_submitted',
    message: `A student uploaded their host university verification document (${application.country}). It is waiting for advisor review.`,
    metadata: { applicationId: application._id, studentId },
    action: { label: 'View results', url: appUrl('/admin/results') },
  });
  await Promise.all(
    advisorIds.map((advisorId) =>
      notifyUserSafely({
        userId: advisorId,
        subject: 'Verification document submitted',
        type: 'exam_verification_submitted',
        message: `A student has uploaded their host university verification document (${application.country}). Please review it and assign their grades.`,
        metadata: { applicationId: application._id, studentId },
        action: { label: 'Review document', url: appUrl('/advisor/results') },
      })
    )
  );
};

/** Country-based access: any advisor supervising the destination country, or the assigned advisor. */
export const advisorCanReviewStudent = async (advisorId: string, studentId: string) => {
  const applications = await Application.find({
    studentId,
    status: { $nin: [ApplicationStatus.DRAFT, ApplicationStatus.REJECTED] },
  }).select('country advisorId');
  if (!applications.length) {
    return false;
  }

  if (applications.some((application) => application.advisorId?.toString() === advisorId)) {
    return true;
  }

  const profile = await AdvisorProfile.findOne({ userId: advisorId }).select('countries');
  const countries = new Set(profile?.countries ?? []);
  return applications.some((application) => countries.has(application.country));
};

const verificationPopulate = [
  { path: 'studentId', select: 'name email sapId' },
  { path: 'applicationId', select: 'country university program' },
  { path: 'reviewedBy', select: 'name email' },
];

export const getAdvisorVerifications = async (advisorId: string) => {
  const profile = await AdvisorProfile.findOne({ userId: advisorId }).select('countries');
  const assigned = await Application.distinct('_id', { advisorId });

  return ExamVerification.find({
    $or: [{ country: { $in: profile?.countries ?? [] } }, { applicationId: { $in: assigned } }],
  })
    .populate(verificationPopulate)
    .sort({ submittedAt: -1 });
};

export const getAllVerificationsForAdmin = async () =>
  ExamVerification.find().populate(verificationPopulate).sort({ submittedAt: -1 });

export const reviewVerification = async (
  advisorId: string,
  verificationId: string,
  input: { action: 'verify' | 'return'; reason?: string }
) => {
  if (!mongoose.Types.ObjectId.isValid(verificationId)) {
    throw new ValidationError(
      'Invalid verification ID.',
      'The verification ID is not valid.',
      'Refresh the page and try again.',
      'EXAM_VERIFICATION_INVALID_ID'
    );
  }

  const verification = await ExamVerification.findById(verificationId);
  if (!verification) {
    throw new NotFoundError(
      'Verification document not found.',
      'The document does not exist.',
      'Refresh the page and try again.',
      'EXAM_VERIFICATION_NOT_FOUND'
    );
  }

  if (!(await advisorCanReviewStudent(advisorId, verification.studentId.toString()))) {
    throw new ForbiddenError(
      'You cannot review this document.',
      'You do not supervise the destination country of this student.',
      'Ask an administrator to add the country to your profile.',
      'EXAM_VERIFICATION_REVIEW_DENIED'
    );
  }

  const reason = readString(input.reason, 'Reason', { max: MAX_COMMENT_LENGTH });
  if (input.action === 'return' && !reason) {
    throw new ValidationError(
      'Give a reason for returning the document.',
      'The student needs to know what to fix before uploading again.',
      'Enter a short reason and try again.',
      'EXAM_VERIFICATION_REASON_REQUIRED'
    );
  }

  verification.status =
    input.action === 'verify' ? ExamVerificationStatus.VERIFIED : ExamVerificationStatus.RETURNED;
  verification.returnReason = input.action === 'return' ? reason : '';
  verification.reviewedBy = new mongoose.Types.ObjectId(advisorId);
  verification.reviewedAt = new Date();
  await verification.save();

  await notifyUserSafely({
    userId: verification.studentId,
    subject: input.action === 'verify' ? 'Verification document accepted' : 'Verification document returned',
    type: input.action === 'verify' ? 'exam_verification_verified' : 'exam_verification_returned',
    message:
      input.action === 'verify'
        ? 'Your advisor has verified your host university document. Your grades will be published once they are assigned.'
        : `Your advisor returned your verification document. Reason: ${reason}. Please upload a corrected document.`,
    metadata: { verificationId: verification._id },
    action: { label: 'Open results', url: appUrl('/dashboard/results') },
  });

  return ExamVerification.findById(verification._id).populate(verificationPopulate);
};
