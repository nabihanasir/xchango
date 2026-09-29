import fs from 'fs/promises';
import mongoose from 'mongoose';
import Application from '../models/Application';
import Course, { CourseType, ICourse } from '../models/Course';
import CourseMatchResult, { ICourseMatchCandidate, ICourseMatchResult, MatchSource } from '../models/CourseMatchResult';
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
import { toPublicFileUrl } from '../utils/upload';
import {
  HomeCourseRanking,
  MatchBasis,
  MatchResponse,
  evaluateCourseMatch,
  rankHomeCourseMatches,
} from './aiCourseMatcherService';
import { extractOutlineText } from './outlineTextService';

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

const STATUS_FIELDS = {
  description: { status: 'aiMatchStatus', error: 'aiMatchError' },
  outline: { status: 'outlineMatchStatus', error: 'outlineMatchError' },
} as const;

/** The final match is based on the uploaded outline once the student has provided one. */
const getActiveBasis = (item: ICourseRequestItem): MatchBasis => (item.uploadedOutline?.text ? 'outline' : 'description');

const setMatchStatus = (item: ICourseRequestItem, basis: MatchBasis, status: AIMatchStatus, error: string | null = null) => {
  item[STATUS_FIELDS[basis].status] = status;
  item[STATUS_FIELDS[basis].error] = error;
};

interface MatchSnapshotInput extends MatchResponse {
  homeCourseId: mongoose.Types.ObjectId;
  matchedBy: MatchSource;
  candidates: ICourseMatchCandidate[];
}

/** Description matches live in the result's top-level fields; outline matches live in `outlineMatch`. */
const toSnapshotUpdate = (basis: MatchBasis, snapshot: MatchSnapshotInput) =>
  basis === 'outline' ? { outlineMatch: snapshot } : snapshot;

const rankingToSnapshot = (ranking: HomeCourseRanking): MatchSnapshotInput => {
  const [best] = ranking.candidates;
  return {
    homeCourseId: best.homeCourse._id as mongoose.Types.ObjectId,
    matchScore: best.matchScore,
    reasoning: best.reasoning,
    matchedBy: ranking.matchedBy,
    candidates: ranking.candidates.map((candidate) => ({
      homeCourseId: candidate.homeCourse._id as mongoose.Types.ObjectId,
      matchScore: candidate.matchScore,
      reasoning: candidate.reasoning,
    })),
  };
};

/** Finds the best home course for one request item and records the ranked candidates. Never throws. */
const autoMatchItem = async (requestId: string, itemId: string, homeCourses: ICourse[], basis: MatchBasis) => {
  const fields = STATUS_FIELDS[basis];
  const inProgressItem = {
    _id: requestId,
    items: { $elemMatch: { _id: itemId, [fields.status]: AIMatchStatus.IN_PROGRESS } },
  };

  try {
    const request = await CourseRequest.findById(requestId);
    const item = request?.items.id(itemId);
    const hostCourse = item ? await Course.findById(item.hostCourseId) : null;
    if (!request || !item || !hostCourse) {
      throw new Error('The host course for this request item could not be loaded.');
    }

    const ranking = await rankHomeCourseMatches(hostCourse, homeCourses, {
      basis,
      uploadedOutline: item.uploadedOutline?.text,
    });
    const snapshot = rankingToSnapshot(ranking);

    const itemUpdate: Record<string, unknown> = {
      [`items.$.${fields.status}`]: AIMatchStatus.COMPLETED,
      [`items.$.${fields.error}`]: null,
    };
    const requestUpdate: Record<string, unknown> = {};

    if (basis === 'outline') {
      // The outline match is final: pair its best course, and send a decided item back for review if it changed.
      itemUpdate['items.$.homeCourseId'] = snapshot.homeCourseId;
      const pairingChanged = !item.homeCourseId || !snapshot.homeCourseId.equals(item.homeCourseId);
      if (pairingChanged && item.status !== CourseRequestItemStatus.PENDING) {
        itemUpdate['items.$.status'] = CourseRequestItemStatus.PENDING;
        itemUpdate['items.$.decidedAt'] = null;
        requestUpdate.status = CourseRequestStatus.UNDER_REVIEW;
      }
    } else if (!item.uploadedOutline?.text) {
      // A description match never replaces the pairing chosen from an uploaded outline.
      itemUpdate['items.$.homeCourseId'] = snapshot.homeCourseId;
    }

    // Only apply the result if the advisor has not re-paired the item while the match was running.
    const update = await CourseRequest.updateOne(inProgressItem, { $set: { ...itemUpdate, ...requestUpdate } });
    if (!update.matchedCount) {
      return;
    }

    await CourseMatchResult.findOneAndUpdate(
      { courseRequestItemId: item._id },
      {
        courseRequestId: request._id,
        courseRequestItemId: item._id,
        hostCourseId: hostCourse._id,
        ...toSnapshotUpdate(basis, snapshot),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error: any) {
    logger.warn('Automatic course match failed', { requestId, itemId, basis, error: error.message });
    await CourseRequest.updateOne(inProgressItem, {
      $set: { [`items.$.${fields.status}`]: AIMatchStatus.FAILED, [`items.$.${fields.error}`]: error.message },
    });
  }
};

/** Auto-matches every in-progress item on a request, one at a time to stay within LLM rate limits. */
export const autoMatchRequestItems = async (requestId: string, itemIds?: string[], basis: MatchBasis = 'description') => {
  const request = await CourseRequest.findById(requestId);
  if (!request) {
    return;
  }

  const items = request.items.filter(
    (item) =>
      item[STATUS_FIELDS[basis].status] === AIMatchStatus.IN_PROGRESS &&
      (!itemIds || itemIds.includes(String(item._id)))
  );
  if (!items.length) {
    return;
  }

  const homeCourses = await Course.find(homeCourseFilter);
  for (const item of items) {
    await autoMatchItem(requestId, String(item._id), homeCourses, basis);
  }
};

const runInBackground = (requestId: string, itemIds: string[] | undefined, basis: MatchBasis) => {
  void autoMatchRequestItems(requestId, itemIds, basis).catch((error) =>
    logger.error('Automatic course matching crashed', { requestId, basis, error: error.message })
  );
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
    .populate('outlineMatch.homeCourseId')
    .populate('outlineMatch.candidates.homeCourseId')
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
  runInBackground(request._id.toString(), undefined, 'description');

  const hydratedRequest = await CourseRequest.findById(request._id).populate(coursePopulate).populate('studentId', 'name email');
  return hydrateRequest(hydratedRequest);
};

/** Students can upload real outlines once their arrival at the host university has been recorded. */
const hasArrivedAtHostUniversity = async (studentId: string) =>
  Boolean(await Application.exists({ studentId, 'arrival.arrivedAt': { $exists: true, $ne: null } }));

export const getStudentRequests = async (studentId: string) => {
  const [requests, outlineUploadOpen] = await Promise.all([
    CourseRequest.find({ studentId })
      .populate(coursePopulate)
      .populate('studentId', 'name email')
      .sort({ submittedAt: -1 }),
    hasArrivedAtHostUniversity(studentId),
  ]);

  const hydrated = await Promise.all(requests.map((request) => hydrateRequest(request)));
  return hydrated.map((request) => request && { ...request, outlineUploadOpen });
};

/**
 * Stores the real outline a student uploaded (PDF/DOCX) or pasted for one course in their request,
 * then runs the outline-based match in the background.
 */
export const uploadCourseOutline = async (
  studentId: string,
  requestId: string,
  itemId: string,
  { file, pastedText }: { file?: Express.Multer.File; pastedText?: string }
) => {
  const discardFile = () => (file ? fs.unlink(file.path).catch(() => undefined) : undefined);

  try {
    const { request, item } = await loadRequestItem(requestId, itemId);
    if (String(request.studentId) !== studentId) {
      throw new Error('Course request not found.');
    }

    if (!(await hasArrivedAtHostUniversity(studentId))) {
      throw new Error('You can upload course outlines once your arrival at the host university has been recorded.');
    }

    if (item.outlineMatchStatus === AIMatchStatus.IN_PROGRESS) {
      throw new Error('Your previous outline for this course is still being matched. Try again in a moment.');
    }

    const text = await extractOutlineText({ filePath: file?.path, pastedText });

    item.uploadedOutline = {
      text,
      fileUrl: file ? toPublicFileUrl(file.path) : '',
      fileName: file?.originalname || '',
      uploadedAt: new Date(),
    };
    setMatchStatus(item, 'outline', AIMatchStatus.IN_PROGRESS);
    request.status = CourseRequestStatus.UNDER_REVIEW;
    await request.save();
  } catch (error) {
    await discardFile();
    throw error;
  }

  runInBackground(requestId, [itemId], 'outline');

  const hydrated = await hydrateById(requestId);
  return hydrated && { ...hydrated, outlineUploadOpen: true };
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

/** Scores the item's currently paired course pair and stores it as the item's active match, keeping earlier candidates. */
const scorePairedCourse = async (
  request: ICourseRequest,
  item: ICourseRequestItem,
  existingResult: ICourseMatchResult | null
) => {
  const basis = getActiveBasis(item);
  const [hostCourse, homeCourse] = await Promise.all([
    Course.findById(item.hostCourseId),
    Course.findById(item.homeCourseId),
  ]);

  if (!hostCourse || !homeCourse) {
    throw new Error('The selected course pair could not be loaded.');
  }

  try {
    const result = await evaluateCourseMatch(hostCourse, homeCourse, {
      basis,
      uploadedOutline: item.uploadedOutline?.text,
    });
    const previousCandidates = (basis === 'outline' ? existingResult?.outlineMatch?.candidates : existingResult?.candidates) || [];
    const otherCandidates = previousCandidates.filter((candidate) => !candidate.homeCourseId.equals(homeCourse._id));

    await CourseMatchResult.findOneAndUpdate(
      { courseRequestItemId: item._id },
      {
        courseRequestId: request._id,
        courseRequestItemId: item._id,
        hostCourseId: hostCourse._id,
        ...toSnapshotUpdate(basis, {
          homeCourseId: homeCourse._id as mongoose.Types.ObjectId,
          matchScore: result.matchScore,
          reasoning: result.reasoning,
          matchedBy: result.matchedBy,
          candidates: [
            ...otherCandidates,
            { homeCourseId: homeCourse._id as mongoose.Types.ObjectId, matchScore: result.matchScore, reasoning: result.reasoning },
          ].sort((left, right) => right.matchScore - left.matchScore),
        }),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    setMatchStatus(item, basis, AIMatchStatus.COMPLETED);
    request.status = CourseRequestStatus.UNDER_REVIEW;
    await request.save();
  } catch (error: any) {
    setMatchStatus(item, basis, AIMatchStatus.FAILED, error.message);
    request.status = CourseRequestStatus.UNDER_REVIEW;
    await request.save();
    throw error;
  }
};

/**
 * Advisor override: pairs a different home course with the item. If the active match (outline, or description
 * before an outline is uploaded) already scored that course its reasoning is reused; otherwise it is scored now.
 */
export const updatePairedHomeCourse = async (requestId: string, itemId: string, homeCourseId: string) => {
  ensureValidObjectId(homeCourseId, 'Invalid home course ID.');
  const { request, item } = await loadRequestItem(requestId, itemId);

  const homeCourse = await Course.findOne({ _id: homeCourseId, ...homeCourseFilter });
  if (!homeCourse) {
    throw new Error('Selected home course could not be found.');
  }

  const basis = getActiveBasis(item);
  item.homeCourseId = homeCourse._id;
  item.status = CourseRequestItemStatus.PENDING;
  item.advisorComment = '';
  item.decidedAt = null;
  request.status = CourseRequestStatus.UNDER_REVIEW;

  const existingResult = await CourseMatchResult.findOne({ courseRequestItemId: item._id });
  const activeSnapshot = basis === 'outline' ? existingResult?.outlineMatch : existingResult;
  const scoredCandidate = activeSnapshot?.candidates?.find((candidate) => candidate.homeCourseId.equals(homeCourse._id));

  if (existingResult && activeSnapshot && scoredCandidate) {
    activeSnapshot.homeCourseId = homeCourse._id;
    activeSnapshot.matchScore = scoredCandidate.matchScore;
    activeSnapshot.reasoning = scoredCandidate.reasoning;
    await existingResult.save();
    setMatchStatus(item, basis, AIMatchStatus.COMPLETED);
    await request.save();
  } else {
    setMatchStatus(item, basis, AIMatchStatus.NOT_STARTED);
    await request.save();
    // A failed score is recorded on the item's match status and error, so the pairing itself still succeeds.
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

/**
 * Re-runs automatic matching for one item from its catalogue description or its uploaded outline.
 * The outline match re-pairs the item; a description match only re-pairs it while no outline exists.
 */
export const rerunAutoMatch = async (requestId: string, itemId: string, basis: MatchBasis = 'description') => {
  const { request, item } = await loadRequestItem(requestId, itemId);

  if (basis === 'outline' && !item.uploadedOutline?.text) {
    throw new Error('The student has not uploaded an outline for this course yet.');
  }

  setMatchStatus(item, basis, AIMatchStatus.IN_PROGRESS);
  if (basis === 'outline' || !item.uploadedOutline?.text) {
    item.status = CourseRequestItemStatus.PENDING;
    item.decidedAt = null;
  }
  request.status = CourseRequestStatus.UNDER_REVIEW;
  await request.save();

  await autoMatchRequestItems(requestId, [itemId], basis);
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
