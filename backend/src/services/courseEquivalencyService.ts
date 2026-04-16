import mongoose from 'mongoose';
import Course, { CourseType, ICourse } from '../models/Course';
import CourseMatchResult from '../models/CourseMatchResult';
import CourseRequest, {
  AIMatchStatus,
  CourseRequestItemStatus,
  CourseRequestStatus,
  ICourseRequest,
  ICourseRequestItem,
} from '../models/CourseRequest';
import StudentProfile from '../models/StudentProfile';
import Notification from '../models/Notification';
import { evaluateCourseMatch } from './aiCourseMatcherService';

interface DecisionInput {
  itemId: string;
  status: CourseRequestItemStatus;
  advisorComment?: string;
}

const coursePopulate = [
  { path: 'items.hostCourseId', populate: { path: 'universityId', select: 'name' } },
  { path: 'items.homeCourseId', populate: { path: 'universityId', select: 'name' } },
];

const ensureValidObjectId = (value: string, message: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(message);
  }
};

const toObjectId = (value: string) => new mongoose.Types.ObjectId(value);

const computeRequestStatus = (items: ICourseRequestItem[]): CourseRequestStatus => {
  if (items.some((item) => item.status === CourseRequestItemStatus.PENDING)) {
    return CourseRequestStatus.UNDER_REVIEW;
  }

  if (items.every((item) => item.status === CourseRequestItemStatus.APPROVED)) {
    return CourseRequestStatus.APPROVED;
  }

  return CourseRequestStatus.REJECTED;
};

const findSuggestedHomeCourse = async (hostCourse: ICourse): Promise<ICourse | null> => {
  const homeCourses = await Course.find({ $or: [{ isHomeCourse: true }, { type: CourseType.HOME }] });
  if (!homeCourses.length) {
    return null;
  }

  let bestMatch: ICourse | null = null;
  let bestScore = -1;

  homeCourses.forEach((candidate) => {
    const currentScore =
      (calculateTextFit(hostCourse.name, candidate.name) * 0.45) +
      (calculateTextFit(hostCourse.description || '', candidate.description || '') * 0.2) +
      (calculateTextFit(hostCourse.outlineText || '', candidate.outlineText || '') * 0.35);

    if (currentScore > bestScore) {
      bestMatch = candidate;
      bestScore = currentScore;
    }
  });

  return bestMatch;
};

const calculateTextFit = (left: string, right: string): number => {
  const normalizedLeft = left.toLowerCase().trim();
  const normalizedRight = right.toLowerCase().trim();
  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }

  const leftWords = new Set(normalizedLeft.split(/\s+/));
  const rightWords = new Set(normalizedRight.split(/\s+/));
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return union ? overlap / union : 0;
};

const attachStudentProfiles = async (requests: Array<Record<string, any>>): Promise<Array<Record<string, any>>> => {
  const studentIds = requests
    .map((request) => request.studentId?._id?.toString?.() || request.studentId?.toString?.())
    .filter(Boolean) as string[];

  const profiles = await StudentProfile.find({ userId: { $in: studentIds } }).lean();
  const profileByUserId = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));

  return requests.map((request) => {
    const studentId = request.studentId?._id?.toString?.() || request.studentId?.toString?.();
    return {
      ...request,
      studentProfile: studentId ? profileByUserId.get(studentId) || null : null,
      courseCount: request.items.length,
    };
  });
};

const hydrateRequest = async (request: ICourseRequest | null): Promise<Record<string, any> | null> => {
  if (!request) {
    return null;
  }

  const requestObject = request.toObject();
  const matchResults = await CourseMatchResult.find({
    courseRequestId: request._id,
    courseRequestItemId: { $in: requestObject.items.map((item: Record<string, any>) => item._id) },
  })
    .populate('hostCourseId')
    .populate('homeCourseId')
    .lean();

  const resultByItemId = new Map(
    matchResults.map((result) => [result.courseRequestItemId.toString(), result])
  );

  const hydrated = {
    ...requestObject,
    items: requestObject.items.map((item: Record<string, any>) => ({
      ...item,
      matchResult: resultByItemId.get(item._id.toString()) || null,
    })),
  };

  const [withProfile] = await attachStudentProfiles([hydrated]);
  return withProfile;
};

const createDecisionMessage = (request: Record<string, any>) => {
  const approvedCourses = request.items
    .filter((item: Record<string, any>) => item.status === CourseRequestItemStatus.APPROVED)
    .map((item: Record<string, any>) => item.hostCourseId?.code || item.hostCourseId?.name);
  const rejectedCourses = request.items
    .filter((item: Record<string, any>) => item.status === CourseRequestItemStatus.REJECTED)
    .map((item: Record<string, any>) => item.hostCourseId?.code || item.hostCourseId?.name);

  const approvedText = approvedCourses.length ? `Approved: ${approvedCourses.join(', ')}.` : '';
  const rejectedText = rejectedCourses.length ? `Rejected: ${rejectedCourses.join(', ')}.` : '';
  const advisorComment = request.advisorComment ? ` Advisor comment: ${request.advisorComment}` : '';

  return `Course equivalency request ${request.status}. ${approvedText} ${rejectedText} ${advisorComment}`.trim();
};

const createStudentNotification = async (request: Record<string, any>) => {
  await Notification.create({
    userId: request.studentId._id || request.studentId,
    message: createDecisionMessage(request),
    subject: 'Course equivalency decision',
    type: 'course_equivalency',
    channels: {
      inApp: true,
      email: true,
    },
    emailStatus: 'queued',
    metadata: {
      courseRequestId: request._id,
      status: request.status,
      decidedAt: new Date().toISOString(),
    },
  });
};

export const listHostCourses = async () =>
  Course.find({ type: CourseType.HOST }).populate('universityId', 'name').sort({ code: 1 });

export const listHomeCourses = async () =>
  Course.find({ $or: [{ isHomeCourse: true }, { type: CourseType.HOME }] })
    .populate('createdBy', 'name email role')
    .sort({ title: 1, name: 1 });

export const createCourseRequest = async (studentId: string, hostCourseIds: string[]) => {
  if (!hostCourseIds.length) {
    throw new Error('Select at least one host course to submit a request.');
  }

  hostCourseIds.forEach((courseId) => ensureValidObjectId(courseId, 'One or more host course IDs are invalid.'));
  const hostCourses = await Course.find({
    _id: { $in: hostCourseIds.map(toObjectId) },
    type: CourseType.HOST,
  });

  if (hostCourses.length !== hostCourseIds.length) {
    throw new Error('One or more selected host courses could not be found.');
  }

  const items = await Promise.all(
    hostCourses.map(async (hostCourse) => {
      const suggestedHomeCourse = await findSuggestedHomeCourse(hostCourse);
      return {
        hostCourseId: hostCourse._id,
        homeCourseId: suggestedHomeCourse?._id || null,
      };
    })
  );

  const request = await CourseRequest.create({
    studentId,
    status: CourseRequestStatus.PENDING,
    items,
  });

  const hydratedRequest = await CourseRequest.findById(request._id).populate(coursePopulate).populate('studentId', 'name email');
  return hydrateRequest(hydratedRequest);
};

export const getStudentRequests = async (studentId: string) => {
  const requests = await CourseRequest.find({ studentId })
    .populate(coursePopulate)
    .populate('studentId', 'name email')
    .sort({ submittedAt: -1 });

  return Promise.all(requests.map((request) => hydrateRequest(request)));
};

export const getAdvisorRequests = async () => {
  const requests = await CourseRequest.find()
    .populate(coursePopulate)
    .populate('studentId', 'name email sapId')
    .sort({ updatedAt: -1 });

  const hydratedRequests = await Promise.all(requests.map((request) => hydrateRequest(request)));
  return hydratedRequests.filter(Boolean);
};

export const getAdvisorRequestById = async (requestId: string) => {
  ensureValidObjectId(requestId, 'Invalid course request ID.');
  const request = await CourseRequest.findById(requestId)
    .populate(coursePopulate)
    .populate('studentId', 'name email sapId');

  if (!request) {
    throw new Error('Course request not found.');
  }

  return hydrateRequest(request);
};

export const updatePairedHomeCourse = async (requestId: string, itemId: string, homeCourseId: string) => {
  ensureValidObjectId(requestId, 'Invalid course request ID.');
  ensureValidObjectId(itemId, 'Invalid request item ID.');
  ensureValidObjectId(homeCourseId, 'Invalid home course ID.');

  const request = await CourseRequest.findById(requestId);
  if (!request) {
    throw new Error('Course request not found.');
  }

  const item = request.items.id(itemId);
  if (!item) {
    throw new Error('Course request item not found.');
  }

  const homeCourse = await Course.findOne({
    _id: homeCourseId,
    $or: [{ isHomeCourse: true }, { type: CourseType.HOME }],
  });
  if (!homeCourse) {
    throw new Error('Selected home course could not be found.');
  }

  item.homeCourseId = homeCourse._id;
  item.aiMatchStatus = AIMatchStatus.NOT_STARTED;
  item.aiMatchError = null;
  item.status = CourseRequestItemStatus.PENDING;
  item.advisorComment = '';
  item.decidedAt = null;
  request.status = CourseRequestStatus.UNDER_REVIEW;
  await request.save();

  await CourseMatchResult.findOneAndDelete({ courseRequestItemId: item._id });

  const hydratedRequest = await CourseRequest.findById(requestId)
    .populate(coursePopulate)
    .populate('studentId', 'name email sapId');
  return hydrateRequest(hydratedRequest);
};

export const runCourseMatch = async (requestId: string, itemId: string) => {
  ensureValidObjectId(requestId, 'Invalid course request ID.');
  ensureValidObjectId(itemId, 'Invalid request item ID.');

  const request = await CourseRequest.findById(requestId);
  if (!request) {
    throw new Error('Course request not found.');
  }

  const item = request.items.id(itemId);
  if (!item) {
    throw new Error('Course request item not found.');
  }

  if (!item.homeCourseId) {
    throw new Error('Select a home course before running the AI match.');
  }

  const [hostCourse, homeCourse] = await Promise.all([
    Course.findById(item.hostCourseId),
    Course.findById(item.homeCourseId),
  ]);

  if (!hostCourse || !homeCourse) {
    throw new Error('The selected course pair could not be loaded.');
  }

  try {
    const result = await evaluateCourseMatch(hostCourse, homeCourse);
    await CourseMatchResult.findOneAndUpdate(
      { courseRequestItemId: item._id },
      {
        courseRequestId: request._id,
        courseRequestItemId: item._id,
        hostCourseId: hostCourse._id,
        homeCourseId: homeCourse._id,
        matchScore: result.matchScore,
        reasoning: result.reasoning,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    item.aiMatchStatus = AIMatchStatus.COMPLETED;
    item.aiMatchError = null;
    request.status = CourseRequestStatus.UNDER_REVIEW;
    await request.save();
  } catch (error: any) {
    item.aiMatchStatus = AIMatchStatus.FAILED;
    item.aiMatchError = error.message;
    request.status = CourseRequestStatus.UNDER_REVIEW;
    await request.save();
    throw error;
  }

  const hydratedRequest = await CourseRequest.findById(requestId)
    .populate(coursePopulate)
    .populate('studentId', 'name email sapId');
  return hydrateRequest(hydratedRequest);
};

export const submitAdvisorDecision = async (
  requestId: string,
  advisorComment: string,
  itemDecisions: DecisionInput[],
  wholeRequestDecision?: CourseRequestItemStatus
) => {
  ensureValidObjectId(requestId, 'Invalid course request ID.');
  const request = await CourseRequest.findById(requestId);
  if (!request) {
    throw new Error('Course request not found.');
  }

  if (wholeRequestDecision) {
    request.items.forEach((item) => {
      item.status = wholeRequestDecision;
      item.decidedAt = new Date();
      if (advisorComment) {
        item.advisorComment = advisorComment;
      }
    });
  } else {
    if (!itemDecisions.length) {
      throw new Error('Provide item decisions or a whole-request decision.');
    }

    itemDecisions.forEach((decision) => {
      const item = request.items.id(decision.itemId);
      if (!item) {
        throw new Error(`Course request item ${decision.itemId} was not found.`);
      }

      item.status = decision.status;
      item.advisorComment = decision.advisorComment || item.advisorComment || '';
      item.decidedAt = new Date();
    });
  }

  request.advisorComment = advisorComment || request.advisorComment || '';
  request.status = computeRequestStatus(request.items);
  await request.save();

  const hydratedRequest = await CourseRequest.findById(requestId)
    .populate(coursePopulate)
    .populate('studentId', 'name email sapId');
  const hydrated = await hydrateRequest(hydratedRequest);

  if (hydrated && [CourseRequestStatus.APPROVED, CourseRequestStatus.REJECTED].includes(hydrated.status as CourseRequestStatus)) {
    await createStudentNotification(hydrated);
  }

  return hydrated;
};
