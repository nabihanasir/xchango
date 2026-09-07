import mongoose from 'mongoose';
import Application from '../models/Application';
import CourseRequest, { CourseRequestItemStatus } from '../models/CourseRequest';
import Notification from '../models/Notification';
import Result, { IResult, ResultStatus } from '../models/Result';
import { advisorCanAccessStudent } from './applicationService';

interface UpsertResultInput {
  grade: string;
  marks?: number | null;
  remarks?: string;
  status: ResultStatus;
  resultFileUrl?: string;
}

const ensureValidObjectId = (value: string, message: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(message);
  }
};

const createStudentNotification = async (result: IResult) => {
  await Notification.create({
    userId: result.studentId,
    message: `Your result has been published. Grade: ${result.grade}${result.marks != null ? ` (${result.marks}/100)` : ''}.`,
    subject: 'Result published',
    type: 'result_published',
    channels: {
      inApp: true,
      email: true,
    },
    emailStatus: 'queued',
    metadata: {
      resultId: result._id,
      courseRequestItemId: result.courseRequestItemId,
      publishedAt: result.publishedAt,
    },
  });
};

export const getStudentResults = async (studentId: string) =>
  Result.find({ studentId, status: ResultStatus.PUBLISHED })
    .populate('hostCourseId')
    .populate('advisorId', 'name email')
    .sort({ updatedAt: -1 });

export const getAdvisorGradableItems = async (advisorId: string) => {
  const studentIds = await Application.distinct('studentId', { advisorId });
  if (!studentIds.length) {
    return [];
  }

  const requests = await CourseRequest.find({ studentId: { $in: studentIds } })
    .populate('items.hostCourseId')
    .populate('studentId', 'name email sapId');

  const approvedItems = requests.flatMap((request) =>
    request.items
      .filter((item) => item.status === CourseRequestItemStatus.APPROVED)
      .map((item) => ({ request, item }))
  );

  if (!approvedItems.length) {
    return [];
  }

  const results = await Result.find({
    courseRequestItemId: { $in: approvedItems.map(({ item }) => item._id) },
  }).lean();
  const resultByItemId = new Map(results.map((result) => [result.courseRequestItemId.toString(), result]));

  return approvedItems.map(({ request, item }) => ({
    courseRequestItemId: item._id,
    hostCourseId: item.hostCourseId,
    student: request.studentId,
    result: resultByItemId.get(String(item._id)) || null,
  }));
};

export const upsertResult = async (
  advisorId: string,
  courseRequestItemId: string,
  input: UpsertResultInput
) => {
  ensureValidObjectId(courseRequestItemId, 'Invalid course request item ID.');

  const request = await CourseRequest.findOne({ 'items._id': courseRequestItemId });
  if (!request) {
    throw new Error('Enrolled course could not be found.');
  }

  const item = request.items.id(courseRequestItemId);
  if (!item) {
    throw new Error('Enrolled course could not be found.');
  }

  if (item.status !== CourseRequestItemStatus.APPROVED) {
    throw new Error('This course is not an approved enrollment yet.');
  }

  const canAccess = await advisorCanAccessStudent(advisorId, request.studentId.toString());
  if (!canAccess) {
    throw new Error('You are not assigned to this student.');
  }

  const update: Record<string, unknown> = {
    studentId: request.studentId,
    courseRequestItemId: item._id,
    hostCourseId: item.hostCourseId,
    advisorId,
    grade: input.grade,
    marks: input.marks ?? null,
    remarks: input.remarks || '',
    status: input.status,
    publishedAt: input.status === ResultStatus.PUBLISHED ? new Date() : null,
  };

  if (input.resultFileUrl) {
    update.resultFileUrl = input.resultFileUrl;
  }

  const result = await Result.findOneAndUpdate(
    { courseRequestItemId: item._id },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (result.status === ResultStatus.PUBLISHED) {
    await createStudentNotification(result);
  }

  return Result.findById(result._id).populate('hostCourseId').populate('advisorId', 'name email');
};

export const getAllResultsForAdmin = async () =>
  Result.find()
    .populate('studentId', 'name email')
    .populate('hostCourseId')
    .populate('advisorId', 'name email')
    .sort({ updatedAt: -1 });
