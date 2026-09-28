import mongoose from 'mongoose';
import Course, { CourseType, ICourse } from '../models/Course';
import CourseMatchResult, { ICourseMatchResult } from '../models/CourseMatchResult';
import CourseRequest, {
  AIMatchStatus,
  CourseRequestItemStatus,
  CourseRequestStatus,
  ICourseRequest,
  ICourseRequestItem,
} from '../models/CourseRequest';
import StudentProfile from '../models/StudentProfile';
import { appUrl, notifyUser } from './notificationService';
import { logger } from '../utils/logger';
import { evaluateCourseMatch, rankHomeCourseMatches } from './aiCourseMatcherService';

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

const homeCourseFilter = { $or: [{ isHomeCourse: true }, { type: CourseType.HOME }] };

const hydrateById = async (requestId: string) => {
  const hydratedRequest = await CourseRequest.findById(requestId)
    .populate(coursePopulate)
    .populate('studentId', 'name email sapId');
  return hydrateRequest(hydratedRequest);
};

/** Finds the best home course for one request item and records the ranked candidates. Never throws. */
const autoMatchItem = async (requestId: string, itemId: string, homeCourses: ICourse[]) => {
  const inProgressItem = {
    _id: requestId,
    items: { $elemMatch: { _id: itemId, aiMatchStatus: AIMatchStatus.IN_PROGRESS } },
  };

  try {
    const request = await CourseRequest.findById(requestId);
    const item = request?.items.id(itemId);
    const hostCourse = item ? await Course.findById(item.hostCourseId) : null;
    if (!request || !item || !hostCourse) {
      throw new Error('The host course for this request item could not be loaded.');
    }

    const ranking = await rankHomeCourseMatches(hostCourse, homeCourses);
    const [best] = ranking.candidates;

    // Only apply the result if the advisor has not re-paired the item while the match was running.
    const update = await CourseRequest.updateOne(inProgressItem, {
      $set: {
        'items.$.homeCourseId': best.homeCourse._id,
        'items.$.aiMatchStatus': AIMatchStatus.COMPLETED,
        'items.$.aiMatchError': null,
      },
    });
    if (!update.matchedCount) {
      return;
    }

    await CourseMatchResult.findOneAndUpdate(
      { courseRequestItemId: item._id },
      {
        courseRequestId: request._id,
        courseRequestItemId: item._id,
        hostCourseId: hostCourse._id,
        homeCourseId: best.homeCourse._id,
        matchScore: best.matchScore,
        reasoning: best.reasoning,
        matchedBy: ranking.matchedBy,
        candidates: ranking.candidates.map((candidate) => ({
          homeCourseId: candidate.homeCourse._id,
          matchScore: candidate.matchScore,
          reasoning: candidate.reasoning,
        })),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error: any) {
    logger.warn('Automatic course match failed', { requestId, itemId, error: error.message });
    await CourseRequest.updateOne(inProgressItem, {
      $set: { 'items.$.aiMatchStatus': AIMatchStatus.FAILED, 'items.$.aiMatchError': error.message },
    });
  }
};

/** Auto-matches every in-progress item on a request, one at a time to stay within LLM rate limits. */
export const autoMatchRequestItems = async (requestId: string, itemIds?: string[]) => {
  const request = await CourseRequest.findById(requestId);
  if (!request) {
    return;
  }

  const items = request.items.filter(
    (item) =>
      item.aiMatchStatus === AIMatchStatus.IN_PROGRESS && (!itemIds || itemIds.includes(String(item._id)))
  );
  if (!items.length) {
    return;
  }

  const homeCourses = await Course.find(homeCourseFilter);
  for (const item of items) {
    await autoMatchItem(requestId, String(item._id), homeCourses);
  }
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
    .populate('candidates.homeCourseId')
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
  await notifyUser({
    userId: request.studentId._id || request.studentId,
    message: createDecisionMessage(request),
    subject: 'Course equivalency decision',
    type: 'course_equivalency',
    metadata: {
      courseRequestId: request._id,
      status: request.status,
      decidedAt: new Date().toISOString(),
    },
    action: { label: 'View decision', url: appUrl('/dashboard/equivalency/requests') },
  });
};

export const listHostCourses = async () =>
  Course.find({ type: CourseType.HOST }).populate('universityId', 'name').sort({ code: 1 });

export const listHomeCourses = async () =>
  Course.find(homeCourseFilter)
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

  const request = await CourseRequest.create({
    studentId,
    status: CourseRequestStatus.PENDING,
    items: hostCourses.map((hostCourse) => ({
      hostCourseId: hostCourse._id,
      homeCourseId: null,
      aiMatchStatus: AIMatchStatus.IN_PROGRESS,
    })),
  });

  // Matching calls the LLM once per course, so it runs in the background; the advisor UI polls for results.
  void autoMatchRequestItems(request._id.toString()).catch((error) =>
    logger.error('Automatic course matching crashed', { requestId: request._id.toString(), error: error.message })
  );

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

const loadRequestItem = async (requestId: string, itemId: string) => {
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

  return { request, item };
};

/** Scores the item's currently paired course pair and stores it as the item's match, keeping earlier candidates. */
const scorePairedCourse = async (
  request: ICourseRequest,
  item: ICourseRequestItem,
  existingResult: ICourseMatchResult | null
) => {
  const [hostCourse, homeCourse] = await Promise.all([
    Course.findById(item.hostCourseId),
    Course.findById(item.homeCourseId),
  ]);

  if (!hostCourse || !homeCourse) {
    throw new Error('The selected course pair could not be loaded.');
  }

  try {
    const result = await evaluateCourseMatch(hostCourse, homeCourse);
    const otherCandidates = (existingResult?.candidates || []).filter(
      (candidate) => !candidate.homeCourseId.equals(homeCourse._id)
    );

    await CourseMatchResult.findOneAndUpdate(
      { courseRequestItemId: item._id },
      {
        courseRequestId: request._id,
        courseRequestItemId: item._id,
        hostCourseId: hostCourse._id,
        homeCourseId: homeCourse._id,
        matchScore: result.matchScore,
        reasoning: result.reasoning,
        matchedBy: result.matchedBy,
        candidates: [
          ...otherCandidates,
          { homeCourseId: homeCourse._id, matchScore: result.matchScore, reasoning: result.reasoning },
        ].sort((left, right) => right.matchScore - left.matchScore),
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
};

/**
 * Advisor override: pairs a different home course with the item. If the matcher already scored that
 * course the stored reasoning is reused; otherwise the new pair is scored straight away.
 */
export const updatePairedHomeCourse = async (requestId: string, itemId: string, homeCourseId: string) => {
  ensureValidObjectId(homeCourseId, 'Invalid home course ID.');
  const { request, item } = await loadRequestItem(requestId, itemId);

  const homeCourse = await Course.findOne({ _id: homeCourseId, ...homeCourseFilter });
  if (!homeCourse) {
    throw new Error('Selected home course could not be found.');
  }

  item.homeCourseId = homeCourse._id;
  item.aiMatchError = null;
  item.status = CourseRequestItemStatus.PENDING;
  item.advisorComment = '';
  item.decidedAt = null;
  request.status = CourseRequestStatus.UNDER_REVIEW;

  const existingResult = await CourseMatchResult.findOne({ courseRequestItemId: item._id });
  const scoredCandidate = existingResult?.candidates.find((candidate) => candidate.homeCourseId.equals(homeCourse._id));

  if (existingResult && scoredCandidate) {
    existingResult.homeCourseId = homeCourse._id;
    existingResult.matchScore = scoredCandidate.matchScore;
    existingResult.reasoning = scoredCandidate.reasoning;
    await existingResult.save();
    item.aiMatchStatus = AIMatchStatus.COMPLETED;
    await request.save();
  } else {
    item.aiMatchStatus = AIMatchStatus.NOT_STARTED;
    await request.save();
    // A failed score is recorded on the item (aiMatchStatus/aiMatchError), so the pairing itself still succeeds.
    await scorePairedCourse(request, item, existingResult).catch(() => undefined);
  }

  return hydrateById(requestId);
};

export const runCourseMatch = async (requestId: string, itemId: string) => {
  const { request, item } = await loadRequestItem(requestId, itemId);

  if (!item.homeCourseId) {
    throw new Error('Select a home course before running the AI match.');
  }

  const existingResult = await CourseMatchResult.findOne({ courseRequestItemId: item._id });
  await scorePairedCourse(request, item, existingResult);
  return hydrateById(requestId);
};

/** Re-runs the automatic outline matching for one item, replacing its paired home course with the new best match. */
export const rerunAutoMatch = async (requestId: string, itemId: string) => {
  const { request, item } = await loadRequestItem(requestId, itemId);

  item.aiMatchStatus = AIMatchStatus.IN_PROGRESS;
  item.aiMatchError = null;
  item.status = CourseRequestItemStatus.PENDING;
  item.decidedAt = null;
  request.status = CourseRequestStatus.UNDER_REVIEW;
  await request.save();

  await autoMatchRequestItems(requestId, [itemId]);
  return hydrateById(requestId);
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
