import mongoose from 'mongoose';
import { NotFoundError, ValidationError } from '../errors/AppError';
import Application, { ApplicationStatus } from '../models/Application';
import Notification from '../models/Notification';
import User, { UserRole } from '../models/User';
import VisaProcess, { IVisaProcess, VisaStatus } from '../models/VisaProcess';

const MAX_REMARKS_LENGTH = 1000;

/** Applications in these states never reach the visa stage, so they are left out. */
const INELIGIBLE_APPLICATION_STATUSES = [ApplicationStatus.DRAFT, ApplicationStatus.REJECTED];

const VISA_STATUS_LABELS: Record<VisaStatus, string> = {
  [VisaStatus.NOT_STARTED]: 'Not started',
  [VisaStatus.DOCUMENTS_REQUIRED]: 'Documents required',
  [VisaStatus.DOCUMENTS_SUBMITTED]: 'Documents submitted',
  [VisaStatus.APPLICATION_SUBMITTED]: 'Visa application submitted',
  [VisaStatus.UNDER_REVIEW]: 'Under review',
  [VisaStatus.APPOINTMENT_SCHEDULED]: 'Appointment scheduled',
  [VisaStatus.APPROVED]: 'Approved',
  [VisaStatus.REJECTED]: 'Rejected',
};

interface UpdateVisaInput {
  status: string;
  remarks?: string;
}

const isVisaStatus = (value: unknown): value is VisaStatus =>
  typeof value === 'string' && (Object.values(VisaStatus) as string[]).includes(value);

const notifyStudent = async (visa: IVisaProcess) => {
  const label = VISA_STATUS_LABELS[visa.status];
  await Notification.create({
    userId: visa.studentId,
    subject: 'Visa process update',
    type: 'visa_status_updated',
    message: `Your visa process status is now "${label}".${visa.remarks ? ` Note from the office: ${visa.remarks}` : ''}`,
    channels: { inApp: true, email: false },
    emailStatus: 'not_requested',
    metadata: { visaProcessId: visa._id, status: visa.status },
  });
};

/**
 * Every student with a live application, paired with their visa record (or
 * `null` when the office has not touched it yet). One row per student, using
 * their most recent eligible application.
 */
export const getVisaOverviewForAdmin = async () => {
  const applications = await Application.find({ status: { $nin: INELIGIBLE_APPLICATION_STATUSES } })
    .sort({ createdAt: -1 })
    .populate('studentId', 'name email sapId')
    .lean();

  const latestByStudent = new Map<string, (typeof applications)[number]>();
  for (const application of applications) {
    const student = application.studentId as unknown as { _id?: mongoose.Types.ObjectId } | null;
    if (!student?._id) continue;

    const key = String(student._id);
    if (!latestByStudent.has(key)) {
      latestByStudent.set(key, application);
    }
  }

  const visas = await VisaProcess.find({ studentId: { $in: [...latestByStudent.keys()] } })
    .populate('updatedBy', 'name')
    .lean();
  const visaByStudent = new Map(visas.map((visa) => [String(visa.studentId), visa]));

  return [...latestByStudent.entries()]
    .map(([studentKey, application]) => ({
      student: application.studentId,
      application: {
        _id: application._id,
        country: application.country,
        university: application.university,
        program: application.program,
        status: application.status,
      },
      visa: visaByStudent.get(studentKey) ?? null,
    }))
    .sort((a, b) =>
      String((a.student as unknown as { name?: string })?.name ?? '').localeCompare(
        String((b.student as unknown as { name?: string })?.name ?? '')
      )
    );
};

/** A student only ever reads their own record; the admin's identity is not exposed. */
export const getStudentVisaProcess = async (studentId: string) =>
  VisaProcess.findOne({ studentId }).select('-updatedBy -history.updatedBy').lean();

export const updateVisaStatus = async (adminId: string, studentId: string, input: UpdateVisaInput) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new ValidationError(
      'Invalid student ID.',
      'The student identifier is not in the expected format.',
      'Select a student from the list and try again.',
      'INVALID_STUDENT_ID'
    );
  }

  if (!isVisaStatus(input.status)) {
    throw new ValidationError(
      'Invalid visa status.',
      `"${String(input.status)}" is not a recognised visa status.`,
      `Choose one of: ${Object.values(VisaStatus).join(', ')}.`,
      'INVALID_VISA_STATUS'
    );
  }

  const remarks = (input.remarks ?? '').trim();
  if (remarks.length > MAX_REMARKS_LENGTH) {
    throw new ValidationError(
      'Remarks are too long.',
      `Remarks must be ${MAX_REMARKS_LENGTH} characters or fewer.`,
      'Shorten the remarks and try again.',
      'VISA_REMARKS_TOO_LONG'
    );
  }

  const student = await User.findOne({ _id: studentId, role: UserRole.STUDENT }).select('_id');
  if (!student) {
    throw new NotFoundError(
      'Student not found.',
      'No student account matches this identifier.',
      'Refresh the list and try again.',
      'STUDENT_NOT_FOUND'
    );
  }

  const application = await Application.findOne({
    studentId,
    status: { $nin: INELIGIBLE_APPLICATION_STATUSES },
  }).sort({ createdAt: -1 });
  if (!application) {
    throw new ValidationError(
      'This student has no active application.',
      'Visa processing only applies to students with a submitted, non-rejected application.',
      'Wait until the student has an active application.',
      'NO_ACTIVE_APPLICATION'
    );
  }

  const existing = await VisaProcess.findOne({ studentId });
  if (existing && existing.status === input.status && existing.remarks === remarks) {
    return existing; // nothing changed — avoid a duplicate history entry and notification
  }

  const visa = existing ?? new VisaProcess({ studentId });
  visa.applicationId = application._id as mongoose.Types.ObjectId;
  visa.status = input.status;
  visa.remarks = remarks;
  visa.updatedBy = new mongoose.Types.ObjectId(adminId);
  visa.history.push({
    status: input.status,
    remarks,
    updatedBy: visa.updatedBy,
    updatedAt: new Date(),
  });
  await visa.save();

  await notifyStudent(visa);

  return visa;
};
