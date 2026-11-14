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
import ProgramOutline from '../models/ProgramOutline';
import University from '../models/University';
import StudentProfile from '../models/StudentProfile';
import { ValidationError } from '../errors/AppError';
import { appUrl, notifyUser } from './notificationService';
import { assertJourneyReady } from './journeyGateService';
import { logger } from '../utils/logger';
import { toPublicFileUrl } from '../utils/upload';
import { discardUploadedFile } from '../utils/storedFiles';
import {
  HomeCourseRanking,
  MatchBasis,
  MatchResponse,
  evaluateCourseMatch,
  rankHomeCourseMatches,
} from './aiCourseMatcherService';
import { extractOutlineText } from './outlineTextService';
import {
  MAX_COMMENT_LENGTH,
  MAX_PASTED_OUTLINE_LENGTH,
  assertObjectId,
  assertOneOf,
  readString,
} from '../utils/validators';
import {
  CourseLike,
  PlanContext,
  evaluateCandidate,
  evaluateCreditCaps,
  isPlanCandidate,
  toFinalScore,
} from './courseEligibilityService';

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

/** Added to the keyword score of home courses that are in the student's plan, so they make the LLM shortlist. */
const PLAN_COURSE_BOOST = 0.25;

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

    // Courses in the student's plan are favoured when the shortlist is made, and the best match is the
    // one with the highest score once eligibility (plan, transcript, course type, credits) is counted.
    const context = await loadPlanContext(String(request.studentId));
    const ranking = await rankHomeCourseMatches(hostCourse, homeCourses, {
      basis,
      uploadedOutline: item.uploadedOutline?.text,
      homeCourseBoost: (homeCourse) => (isPlanCandidate(context, homeCourse) ? PLAN_COURSE_BOOST : 0),
    });
    const snapshot = rankingToSnapshot({
      ...ranking,
      candidates: [...ranking.candidates].sort(
        (left, right) =>
          toFinalScore(right.matchScore, evaluateCandidate(context, hostCourse, right.homeCourse)) -
          toFinalScore(left.matchScore, evaluateCandidate(context, hostCourse, left.homeCourse))
      ),
    });

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

const toPlanContext = (
  outline: Record<string, any> | null | undefined,
  transcript: Record<string, any> | null | undefined
): PlanContext => ({
  outline: outline?.semesters?.length ? (outline as PlanContext['outline']) : null,
  transcript: transcript?.semesters?.length ? (transcript as PlanContext['transcript']) : null,
});

const loadPlanContext = async (studentId: string): Promise<PlanContext> => {
  const [outline, profile] = await Promise.all([
    ProgramOutline.findOne({ studentId }).lean(),
    StudentProfile.findOne({ userId: studentId }).lean(),
  ]);
  return toPlanContext(outline, profile?.transcript);
};

const sameId = (left: any, right: any) => Boolean(left && right && String(left._id ?? left) === String(right._id ?? right));

/** Adds the eligibility checks and the final score to every candidate of a stored match, best first. */
const decorateSnapshot = (snapshot: Record<string, any> | null | undefined, hostCourse: CourseLike, context: PlanContext) => {
  if (!snapshot) {
    return snapshot;
  }

  const candidates = ((snapshot.candidates || []) as Array<Record<string, any>>)
    .filter((candidate) => candidate.homeCourseId)
    .map((candidate): Record<string, any> => {
      const eligibility = evaluateCandidate(context, hostCourse, candidate.homeCourseId);
      return {
        ...candidate,
        contentScore: candidate.matchScore,
        matchScore: toFinalScore(candidate.matchScore, eligibility),
        eligibility,
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore);

  const paired = candidates.find((candidate) => sameId(candidate.homeCourseId, snapshot.homeCourseId));
  return {
    ...snapshot,
    candidates,
    ...(paired ? { matchScore: paired.matchScore, contentScore: paired.contentScore, eligibility: paired.eligibility } : {}),
  };
};

/**
 * Checks a request against the student's program plan and transcript: the semester credit limit for each
 * course, and the plan/passed/type/credit checks for every home course the matcher scored.
 */
const withEligibility = async (request: Record<string, any>): Promise<Record<string, any>> => {
  const studentId = String(request.studentId?._id ?? request.studentId);
  const outline = await ProgramOutline.findOne({ studentId }).lean();
  const context = toPlanContext(outline, request.studentProfile?.transcript);

  const hostCourses: CourseLike[] = request.items.map((item: Record<string, any>) => item.hostCourseId || { creditHours: 0 });
  const { summary, checks } = evaluateCreditCaps(context, hostCourses);

  return {
    ...request,
    planSummary: summary,
    programOutline: outline || null,
    items: request.items.map((item: Record<string, any>, index: number) => {
      const matchResult = item.matchResult && {
        ...decorateSnapshot(item.matchResult, hostCourses[index], context),
        outlineMatch: decorateSnapshot(item.matchResult.outlineMatch, hostCourses[index], context),
      };
      return { ...item, creditCap: checks[index], matchResult: matchResult || null };
    }),
  };
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
  return withEligibility(withProfile);
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
    action: { label: 'View decision', url: appUrl('/dashboard/courses') },
  });
};

export const listHostCourses = async () =>
  Course.find({ type: CourseType.HOST }).populate('universityId', 'name').sort({ code: 1 });

/** Ids of the universities a student has applied to (rejected applications do not count). */
const getChosenUniversityIds = async (studentId: string) => {
  const names: string[] = await Application.distinct('university', {
    studentId,
    status: { $ne: 'rejected' },
  });
  const wanted = new Set(names.map((name) => String(name).trim().toLowerCase()).filter(Boolean));
  if (!wanted.size) {
    return [];
  }
  // Applications store the university's short code (e.g. "MMU"); older data may hold the full name.
  const universities = await University.find().select('name shortName');
  return universities
    .filter(
      (university) =>
        wanted.has(String(university.name).trim().toLowerCase()) ||
        wanted.has(String(university.shortName ?? '').trim().toLowerCase())
    )
    .map((university) => university._id);
};

/** Host courses a student may request: only those of universities they have applied to. */
export const listHostCoursesForStudent = async (studentId: string) => {
  const universityIds = await getChosenUniversityIds(studentId);
  if (!universityIds.length) {
    return [];
  }
  return Course.find({ type: CourseType.HOST, universityId: { $in: universityIds } })
    .populate('universityId', 'name')
    .sort({ code: 1 });
};

export const listHomeCourses = async () =>
  Course.find(homeCourseFilter)
    .populate('createdBy', 'name email role')
    .sort({ title: 1, name: 1 });

/** Tells the student's advisor that a course request is waiting. Never blocks the request itself. */
const notifyAdvisorsOfCourseRequest = async (studentId: string, courseCount: number) => {
  try {
    const advisorIds = await Application.distinct('advisorId', { studentId, advisorId: { $ne: null } });
    await Promise.all(
      advisorIds.map((advisorId) =>
        notifyUser({
          userId: advisorId,
          subject: 'New course equivalency request',
          type: 'course_request_submitted',
          message: `A student submitted a course equivalency request for ${courseCount} host course${courseCount === 1 ? '' : 's'}. Please review and match them.`,
          metadata: { studentId },
          action: { label: 'Review request', url: appUrl('/advisor/requests') },
        })
      )
    );
  } catch (error) {
    logger.error('Failed to notify advisor of course request', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const createCourseRequest = async (studentId: string, hostCourseIds: string[]) => {
  if (!Array.isArray(hostCourseIds) || hostCourseIds.length > 50 || hostCourseIds.some((id) => typeof id !== 'string')) {
    throw new ValidationError(
      'Course selection is invalid.',
      'Host course IDs must be a list of up to 50 identifiers.',
      'Reload the page and select the courses again.',
      'COURSE_SELECTION_INVALID'
    );
  }
  if (!hostCourseIds.length) {
    throw new Error('Select at least one host course to submit a request.');
  }

  // Courses can only be chosen after the advisor has shortlisted the student, and never on a stopped application.
  await assertJourneyReady(studentId, 'course-selection');

  // One request at a time: a new one is only allowed after the previous one was rejected.
  const activeRequest = await CourseRequest.findOne({
    studentId,
    status: {
      $in: [CourseRequestStatus.PENDING, CourseRequestStatus.UNDER_REVIEW, CourseRequestStatus.APPROVED],
    },
  });
  if (activeRequest) {
    throw new ValidationError(
      activeRequest.status === CourseRequestStatus.APPROVED
        ? 'Your course request has already been approved.'
        : 'You already have a course request awaiting advisor review.',
      'A student can only have one course request that is pending or approved.',
      activeRequest.status === CourseRequestStatus.APPROVED
        ? 'Continue to the document upload step.'
        : 'Wait for your advisor to approve or reject the request, then resubmit if it is rejected.',
      'COURSE_REQUEST_ALREADY_ACTIVE'
    );
  }

  hostCourseIds = [...new Set(hostCourseIds.map((courseId) => assertObjectId(courseId, 'Host course', 'COURSE_SELECTION_INVALID')))];
  const hostCourses = await Course.find({
    _id: { $in: hostCourseIds.map(toObjectId) },
    type: CourseType.HOST,
  });

  if (hostCourses.length !== hostCourseIds.length) {
    throw new Error('One or more selected host courses could not be found.');
  }

  const allowedUniversityIds = new Set((await getChosenUniversityIds(studentId)).map(String));
  if (hostCourses.some((course) => !course.universityId || !allowedUniversityIds.has(course.universityId.toString()))) {
    throw new ValidationError(
      'Some selected courses are not available to you.',
      'You can only request courses from universities you have applied to.',
      'Remove courses from other universities and submit again.',
      'COURSE_NOT_AVAILABLE'
    );
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
  await notifyAdvisorsOfCourseRequest(studentId, hostCourses.length);

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
  const discardFile = () => discardUploadedFile(file);

  try {
    const { request, item } = await loadRequestItem(requestId, itemId);
    if (String(request.studentId) !== studentId) {
      throw new Error('Course request not found.');
    }

    await assertJourneyReady(studentId, 'outline');

    if (!(await hasArrivedAtHostUniversity(studentId))) {
      throw new Error('You can upload course outlines once your arrival at the host university has been recorded.');
    }

    if (item.outlineMatchStatus === AIMatchStatus.IN_PROGRESS) {
      throw new Error('Your previous outline for this course is still being matched. Try again in a moment.');
    }

    if (pastedText !== undefined && (typeof pastedText !== 'string' || pastedText.length > MAX_PASTED_OUTLINE_LENGTH)) {
      throw new ValidationError(
        'Pasted outline is too long.',
        `Pasted text must be ${MAX_PASTED_OUTLINE_LENGTH} characters or fewer.`,
        'Upload the outline as a file or shorten the text.',
        'OUTLINE_TEXT_TOO_LONG'
      );
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

/**
 * Once an advisor has approved or rejected a request, the decision is final. A rejected student sends a new
 * request instead, and the outline check after arrival is the only thing that can reopen an approved item.
 */
const assertNotDecided = (request: ICourseRequest) => {
  if (request.status === CourseRequestStatus.APPROVED || request.status === CourseRequestStatus.REJECTED) {
    throw new ValidationError(
      `This request has already been ${request.status}.`,
      'An advisor decision on a course request is final and cannot be changed.',
      request.status === CourseRequestStatus.REJECTED
        ? 'The student can submit a new course request if they want to try again.'
        : 'No further action is needed on this request.',
      'COURSE_DECISION_FINAL'
    );
  }
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
  assertObjectId(homeCourseId, 'Home course', 'HOME_COURSE_INVALID');
  const { request, item } = await loadRequestItem(requestId, itemId);
  assertNotDecided(request);

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
  assertNotDecided(request);

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
  if (basis === 'description') {
    assertNotDecided(request);
  }

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
  assertObjectId(requestId, 'Course request', 'COURSE_REQUEST_INVALID');
  const decisionStatuses = Object.values(CourseRequestItemStatus) as CourseRequestItemStatus[];
  advisorComment = readString(advisorComment, 'Advisor comment', { max: MAX_COMMENT_LENGTH });
  if (wholeRequestDecision !== undefined && wholeRequestDecision !== null) {
    assertOneOf(wholeRequestDecision, decisionStatuses, 'Decision', 'COURSE_DECISION_INVALID');
  }
  if (!Array.isArray(itemDecisions) || itemDecisions.length > 100) {
    throw new ValidationError('Item decisions are invalid.', 'Item decisions must be a list.', 'Reload the page and try again.', 'COURSE_DECISION_INVALID');
  }
  itemDecisions = itemDecisions.map((decision) => ({
    itemId: assertObjectId(decision?.itemId, 'Request item', 'COURSE_DECISION_INVALID'),
    status: assertOneOf(decision?.status, decisionStatuses, 'Decision', 'COURSE_DECISION_INVALID'),
    advisorComment: readString(decision?.advisorComment, 'Advisor comment', { max: MAX_COMMENT_LENGTH }),
  }));
  const request = await CourseRequest.findById(requestId);
  if (!request) {
    throw new Error('Course request not found.');
  }
  assertNotDecided(request);

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
