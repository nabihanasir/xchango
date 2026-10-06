"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAdvisorDecision = exports.rerunAutoMatch = exports.runCourseMatch = exports.updatePairedHomeCourse = exports.getAdvisorRequestById = exports.getAdvisorRequests = exports.uploadCourseOutline = exports.getStudentRequests = exports.createCourseRequest = exports.listHomeCourses = exports.listHostCourses = exports.autoMatchRequestItems = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const mongoose_1 = __importDefault(require("mongoose"));
const Application_1 = __importDefault(require("../models/Application"));
const Course_1 = __importStar(require("../models/Course"));
const CourseMatchResult_1 = __importDefault(require("../models/CourseMatchResult"));
const CourseRequest_1 = __importStar(require("../models/CourseRequest"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const notificationService_1 = require("./notificationService");
const logger_1 = require("../utils/logger");
const upload_1 = require("../utils/upload");
const aiCourseMatcherService_1 = require("./aiCourseMatcherService");
const outlineTextService_1 = require("./outlineTextService");
const coursePopulate = [
    { path: 'items.hostCourseId', populate: { path: 'universityId', select: 'name' } },
    { path: 'items.homeCourseId', populate: { path: 'universityId', select: 'name' } },
];
const ensureValidObjectId = (value, message) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(value)) {
        throw new Error(message);
    }
};
const toObjectId = (value) => new mongoose_1.default.Types.ObjectId(value);
const computeRequestStatus = (items) => {
    if (items.some((item) => item.status === CourseRequest_1.CourseRequestItemStatus.PENDING)) {
        return CourseRequest_1.CourseRequestStatus.UNDER_REVIEW;
    }
    if (items.every((item) => item.status === CourseRequest_1.CourseRequestItemStatus.APPROVED)) {
        return CourseRequest_1.CourseRequestStatus.APPROVED;
    }
    return CourseRequest_1.CourseRequestStatus.REJECTED;
};
const homeCourseFilter = { $or: [{ isHomeCourse: true }, { type: Course_1.CourseType.HOME }] };
const hydrateById = async (requestId) => {
    const hydratedRequest = await CourseRequest_1.default.findById(requestId)
        .populate(coursePopulate)
        .populate('studentId', 'name email sapId');
    return hydrateRequest(hydratedRequest);
};
const STATUS_FIELDS = {
    description: { status: 'aiMatchStatus', error: 'aiMatchError' },
    outline: { status: 'outlineMatchStatus', error: 'outlineMatchError' },
};
/** The final match is based on the uploaded outline once the student has provided one. */
const getActiveBasis = (item) => (item.uploadedOutline?.text ? 'outline' : 'description');
const setMatchStatus = (item, basis, status, error = null) => {
    item[STATUS_FIELDS[basis].status] = status;
    item[STATUS_FIELDS[basis].error] = error;
};
/** Description matches live in the result's top-level fields; outline matches live in `outlineMatch`. */
const toSnapshotUpdate = (basis, snapshot) => basis === 'outline' ? { outlineMatch: snapshot } : snapshot;
const rankingToSnapshot = (ranking) => {
    const [best] = ranking.candidates;
    return {
        homeCourseId: best.homeCourse._id,
        matchScore: best.matchScore,
        reasoning: best.reasoning,
        matchedBy: ranking.matchedBy,
        candidates: ranking.candidates.map((candidate) => ({
            homeCourseId: candidate.homeCourse._id,
            matchScore: candidate.matchScore,
            reasoning: candidate.reasoning,
        })),
    };
};
/** Finds the best home course for one request item and records the ranked candidates. Never throws. */
const autoMatchItem = async (requestId, itemId, homeCourses, basis) => {
    const fields = STATUS_FIELDS[basis];
    const inProgressItem = {
        _id: requestId,
        items: { $elemMatch: { _id: itemId, [fields.status]: CourseRequest_1.AIMatchStatus.IN_PROGRESS } },
    };
    try {
        const request = await CourseRequest_1.default.findById(requestId);
        const item = request?.items.id(itemId);
        const hostCourse = item ? await Course_1.default.findById(item.hostCourseId) : null;
        if (!request || !item || !hostCourse) {
            throw new Error('The host course for this request item could not be loaded.');
        }
        const ranking = await (0, aiCourseMatcherService_1.rankHomeCourseMatches)(hostCourse, homeCourses, {
            basis,
            uploadedOutline: item.uploadedOutline?.text,
        });
        const snapshot = rankingToSnapshot(ranking);
        const itemUpdate = {
            [`items.$.${fields.status}`]: CourseRequest_1.AIMatchStatus.COMPLETED,
            [`items.$.${fields.error}`]: null,
        };
        const requestUpdate = {};
        if (basis === 'outline') {
            // The outline match is final: pair its best course, and send a decided item back for review if it changed.
            itemUpdate['items.$.homeCourseId'] = snapshot.homeCourseId;
            const pairingChanged = !item.homeCourseId || !snapshot.homeCourseId.equals(item.homeCourseId);
            if (pairingChanged && item.status !== CourseRequest_1.CourseRequestItemStatus.PENDING) {
                itemUpdate['items.$.status'] = CourseRequest_1.CourseRequestItemStatus.PENDING;
                itemUpdate['items.$.decidedAt'] = null;
                requestUpdate.status = CourseRequest_1.CourseRequestStatus.UNDER_REVIEW;
            }
        }
        else if (!item.uploadedOutline?.text) {
            // A description match never replaces the pairing chosen from an uploaded outline.
            itemUpdate['items.$.homeCourseId'] = snapshot.homeCourseId;
        }
        // Only apply the result if the advisor has not re-paired the item while the match was running.
        const update = await CourseRequest_1.default.updateOne(inProgressItem, { $set: { ...itemUpdate, ...requestUpdate } });
        if (!update.matchedCount) {
            return;
        }
        await CourseMatchResult_1.default.findOneAndUpdate({ courseRequestItemId: item._id }, {
            courseRequestId: request._id,
            courseRequestItemId: item._id,
            hostCourseId: hostCourse._id,
            ...toSnapshotUpdate(basis, snapshot),
        }, { upsert: true, new: true, setDefaultsOnInsert: true });
    }
    catch (error) {
        logger_1.logger.warn('Automatic course match failed', { requestId, itemId, basis, error: error.message });
        await CourseRequest_1.default.updateOne(inProgressItem, {
            $set: { [`items.$.${fields.status}`]: CourseRequest_1.AIMatchStatus.FAILED, [`items.$.${fields.error}`]: error.message },
        });
    }
};
/** Auto-matches every in-progress item on a request, one at a time to stay within LLM rate limits. */
const autoMatchRequestItems = async (requestId, itemIds, basis = 'description') => {
    const request = await CourseRequest_1.default.findById(requestId);
    if (!request) {
        return;
    }
    const items = request.items.filter((item) => item[STATUS_FIELDS[basis].status] === CourseRequest_1.AIMatchStatus.IN_PROGRESS &&
        (!itemIds || itemIds.includes(String(item._id))));
    if (!items.length) {
        return;
    }
    const homeCourses = await Course_1.default.find(homeCourseFilter);
    for (const item of items) {
        await autoMatchItem(requestId, String(item._id), homeCourses, basis);
    }
};
exports.autoMatchRequestItems = autoMatchRequestItems;
const runInBackground = (requestId, itemIds, basis) => {
    void (0, exports.autoMatchRequestItems)(requestId, itemIds, basis).catch((error) => logger_1.logger.error('Automatic course matching crashed', { requestId, basis, error: error.message }));
};
const attachStudentProfiles = async (requests) => {
    const studentIds = requests
        .map((request) => request.studentId?._id?.toString?.() || request.studentId?.toString?.())
        .filter(Boolean);
    const profiles = await StudentProfile_1.default.find({ userId: { $in: studentIds } }).lean();
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
const hydrateRequest = async (request) => {
    if (!request) {
        return null;
    }
    const requestObject = request.toObject();
    const matchResults = await CourseMatchResult_1.default.find({
        courseRequestId: request._id,
        courseRequestItemId: { $in: requestObject.items.map((item) => item._id) },
    })
        .populate('hostCourseId')
        .populate('homeCourseId')
        .populate('candidates.homeCourseId')
        .populate('outlineMatch.homeCourseId')
        .populate('outlineMatch.candidates.homeCourseId')
        .lean();
    const resultByItemId = new Map(matchResults.map((result) => [result.courseRequestItemId.toString(), result]));
    const hydrated = {
        ...requestObject,
        items: requestObject.items.map((item) => ({
            ...item,
            matchResult: resultByItemId.get(item._id.toString()) || null,
        })),
    };
    const [withProfile] = await attachStudentProfiles([hydrated]);
    return withProfile;
};
const createDecisionMessage = (request) => {
    const approvedCourses = request.items
        .filter((item) => item.status === CourseRequest_1.CourseRequestItemStatus.APPROVED)
        .map((item) => item.hostCourseId?.code || item.hostCourseId?.name);
    const rejectedCourses = request.items
        .filter((item) => item.status === CourseRequest_1.CourseRequestItemStatus.REJECTED)
        .map((item) => item.hostCourseId?.code || item.hostCourseId?.name);
    const approvedText = approvedCourses.length ? `Approved: ${approvedCourses.join(', ')}.` : '';
    const rejectedText = rejectedCourses.length ? `Rejected: ${rejectedCourses.join(', ')}.` : '';
    const advisorComment = request.advisorComment ? ` Advisor comment: ${request.advisorComment}` : '';
    return `Course equivalency request ${request.status}. ${approvedText} ${rejectedText} ${advisorComment}`.trim();
};
const createStudentNotification = async (request) => {
    await (0, notificationService_1.notifyUser)({
        userId: request.studentId._id || request.studentId,
        message: createDecisionMessage(request),
        subject: 'Course equivalency decision',
        type: 'course_equivalency',
        metadata: {
            courseRequestId: request._id,
            status: request.status,
            decidedAt: new Date().toISOString(),
        },
        action: { label: 'View decision', url: (0, notificationService_1.appUrl)('/dashboard/equivalency/requests') },
    });
};
const listHostCourses = async () => Course_1.default.find({ type: Course_1.CourseType.HOST }).populate('universityId', 'name').sort({ code: 1 });
exports.listHostCourses = listHostCourses;
const listHomeCourses = async () => Course_1.default.find(homeCourseFilter)
    .populate('createdBy', 'name email role')
    .sort({ title: 1, name: 1 });
exports.listHomeCourses = listHomeCourses;
const createCourseRequest = async (studentId, hostCourseIds) => {
    if (!hostCourseIds.length) {
        throw new Error('Select at least one host course to submit a request.');
    }
    hostCourseIds.forEach((courseId) => ensureValidObjectId(courseId, 'One or more host course IDs are invalid.'));
    const hostCourses = await Course_1.default.find({
        _id: { $in: hostCourseIds.map(toObjectId) },
        type: Course_1.CourseType.HOST,
    });
    if (hostCourses.length !== hostCourseIds.length) {
        throw new Error('One or more selected host courses could not be found.');
    }
    const request = await CourseRequest_1.default.create({
        studentId,
        status: CourseRequest_1.CourseRequestStatus.PENDING,
        items: hostCourses.map((hostCourse) => ({
            hostCourseId: hostCourse._id,
            homeCourseId: null,
            aiMatchStatus: CourseRequest_1.AIMatchStatus.IN_PROGRESS,
        })),
    });
    // Matching calls the LLM once per course, so it runs in the background; the advisor UI polls for results.
    runInBackground(request._id.toString(), undefined, 'description');
    const hydratedRequest = await CourseRequest_1.default.findById(request._id).populate(coursePopulate).populate('studentId', 'name email');
    return hydrateRequest(hydratedRequest);
};
exports.createCourseRequest = createCourseRequest;
/** Students can upload real outlines once their arrival at the host university has been recorded. */
const hasArrivedAtHostUniversity = async (studentId) => Boolean(await Application_1.default.exists({ studentId, 'arrival.arrivedAt': { $exists: true, $ne: null } }));
const getStudentRequests = async (studentId) => {
    const [requests, outlineUploadOpen] = await Promise.all([
        CourseRequest_1.default.find({ studentId })
            .populate(coursePopulate)
            .populate('studentId', 'name email')
            .sort({ submittedAt: -1 }),
        hasArrivedAtHostUniversity(studentId),
    ]);
    const hydrated = await Promise.all(requests.map((request) => hydrateRequest(request)));
    return hydrated.map((request) => request && { ...request, outlineUploadOpen });
};
exports.getStudentRequests = getStudentRequests;
/**
 * Stores the real outline a student uploaded (PDF/DOCX) or pasted for one course in their request,
 * then runs the outline-based match in the background.
 */
const uploadCourseOutline = async (studentId, requestId, itemId, { file, pastedText }) => {
    const discardFile = () => (file ? promises_1.default.unlink(file.path).catch(() => undefined) : undefined);
    try {
        const { request, item } = await loadRequestItem(requestId, itemId);
        if (String(request.studentId) !== studentId) {
            throw new Error('Course request not found.');
        }
        if (!(await hasArrivedAtHostUniversity(studentId))) {
            throw new Error('You can upload course outlines once your arrival at the host university has been recorded.');
        }
        if (item.outlineMatchStatus === CourseRequest_1.AIMatchStatus.IN_PROGRESS) {
            throw new Error('Your previous outline for this course is still being matched. Try again in a moment.');
        }
        const text = await (0, outlineTextService_1.extractOutlineText)({ filePath: file?.path, pastedText });
        item.uploadedOutline = {
            text,
            fileUrl: file ? (0, upload_1.toPublicFileUrl)(file.path) : '',
            fileName: file?.originalname || '',
            uploadedAt: new Date(),
        };
        setMatchStatus(item, 'outline', CourseRequest_1.AIMatchStatus.IN_PROGRESS);
        request.status = CourseRequest_1.CourseRequestStatus.UNDER_REVIEW;
        await request.save();
    }
    catch (error) {
        await discardFile();
        throw error;
    }
    runInBackground(requestId, [itemId], 'outline');
    const hydrated = await hydrateById(requestId);
    return hydrated && { ...hydrated, outlineUploadOpen: true };
};
exports.uploadCourseOutline = uploadCourseOutline;
const getAdvisorRequests = async () => {
    const requests = await CourseRequest_1.default.find()
        .populate(coursePopulate)
        .populate('studentId', 'name email sapId')
        .sort({ updatedAt: -1 });
    const hydratedRequests = await Promise.all(requests.map((request) => hydrateRequest(request)));
    return hydratedRequests.filter(Boolean);
};
exports.getAdvisorRequests = getAdvisorRequests;
const getAdvisorRequestById = async (requestId) => {
    ensureValidObjectId(requestId, 'Invalid course request ID.');
    const request = await CourseRequest_1.default.findById(requestId)
        .populate(coursePopulate)
        .populate('studentId', 'name email sapId');
    if (!request) {
        throw new Error('Course request not found.');
    }
    return hydrateRequest(request);
};
exports.getAdvisorRequestById = getAdvisorRequestById;
const loadRequestItem = async (requestId, itemId) => {
    ensureValidObjectId(requestId, 'Invalid course request ID.');
    ensureValidObjectId(itemId, 'Invalid request item ID.');
    const request = await CourseRequest_1.default.findById(requestId);
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
const scorePairedCourse = async (request, item, existingResult) => {
    const basis = getActiveBasis(item);
    const [hostCourse, homeCourse] = await Promise.all([
        Course_1.default.findById(item.hostCourseId),
        Course_1.default.findById(item.homeCourseId),
    ]);
    if (!hostCourse || !homeCourse) {
        throw new Error('The selected course pair could not be loaded.');
    }
    try {
        const result = await (0, aiCourseMatcherService_1.evaluateCourseMatch)(hostCourse, homeCourse, {
            basis,
            uploadedOutline: item.uploadedOutline?.text,
        });
        const previousCandidates = (basis === 'outline' ? existingResult?.outlineMatch?.candidates : existingResult?.candidates) || [];
        const otherCandidates = previousCandidates.filter((candidate) => !candidate.homeCourseId.equals(homeCourse._id));
        await CourseMatchResult_1.default.findOneAndUpdate({ courseRequestItemId: item._id }, {
            courseRequestId: request._id,
            courseRequestItemId: item._id,
            hostCourseId: hostCourse._id,
            ...toSnapshotUpdate(basis, {
                homeCourseId: homeCourse._id,
                matchScore: result.matchScore,
                reasoning: result.reasoning,
                matchedBy: result.matchedBy,
                candidates: [
                    ...otherCandidates,
                    { homeCourseId: homeCourse._id, matchScore: result.matchScore, reasoning: result.reasoning },
                ].sort((left, right) => right.matchScore - left.matchScore),
            }),
        }, { upsert: true, new: true, setDefaultsOnInsert: true });
        setMatchStatus(item, basis, CourseRequest_1.AIMatchStatus.COMPLETED);
        request.status = CourseRequest_1.CourseRequestStatus.UNDER_REVIEW;
        await request.save();
    }
    catch (error) {
        setMatchStatus(item, basis, CourseRequest_1.AIMatchStatus.FAILED, error.message);
        request.status = CourseRequest_1.CourseRequestStatus.UNDER_REVIEW;
        await request.save();
        throw error;
    }
};
/**
 * Advisor override: pairs a different home course with the item. If the active match (outline, or description
 * before an outline is uploaded) already scored that course its reasoning is reused; otherwise it is scored now.
 */
const updatePairedHomeCourse = async (requestId, itemId, homeCourseId) => {
    ensureValidObjectId(homeCourseId, 'Invalid home course ID.');
    const { request, item } = await loadRequestItem(requestId, itemId);
    const homeCourse = await Course_1.default.findOne({ _id: homeCourseId, ...homeCourseFilter });
    if (!homeCourse) {
        throw new Error('Selected home course could not be found.');
    }
    const basis = getActiveBasis(item);
    item.homeCourseId = homeCourse._id;
    item.status = CourseRequest_1.CourseRequestItemStatus.PENDING;
    item.advisorComment = '';
    item.decidedAt = null;
    request.status = CourseRequest_1.CourseRequestStatus.UNDER_REVIEW;
    const existingResult = await CourseMatchResult_1.default.findOne({ courseRequestItemId: item._id });
    const activeSnapshot = basis === 'outline' ? existingResult?.outlineMatch : existingResult;
    const scoredCandidate = activeSnapshot?.candidates?.find((candidate) => candidate.homeCourseId.equals(homeCourse._id));
    if (existingResult && activeSnapshot && scoredCandidate) {
        activeSnapshot.homeCourseId = homeCourse._id;
        activeSnapshot.matchScore = scoredCandidate.matchScore;
        activeSnapshot.reasoning = scoredCandidate.reasoning;
        await existingResult.save();
        setMatchStatus(item, basis, CourseRequest_1.AIMatchStatus.COMPLETED);
        await request.save();
    }
    else {
        setMatchStatus(item, basis, CourseRequest_1.AIMatchStatus.NOT_STARTED);
        await request.save();
        // A failed score is recorded on the item's match status and error, so the pairing itself still succeeds.
        await scorePairedCourse(request, item, existingResult).catch(() => undefined);
    }
    return hydrateById(requestId);
};
exports.updatePairedHomeCourse = updatePairedHomeCourse;
const runCourseMatch = async (requestId, itemId) => {
    const { request, item } = await loadRequestItem(requestId, itemId);
    if (!item.homeCourseId) {
        throw new Error('Select a home course before running the AI match.');
    }
    const existingResult = await CourseMatchResult_1.default.findOne({ courseRequestItemId: item._id });
    await scorePairedCourse(request, item, existingResult);
    return hydrateById(requestId);
};
exports.runCourseMatch = runCourseMatch;
/**
 * Re-runs automatic matching for one item from its catalogue description or its uploaded outline.
 * The outline match re-pairs the item; a description match only re-pairs it while no outline exists.
 */
const rerunAutoMatch = async (requestId, itemId, basis = 'description') => {
    const { request, item } = await loadRequestItem(requestId, itemId);
    if (basis === 'outline' && !item.uploadedOutline?.text) {
        throw new Error('The student has not uploaded an outline for this course yet.');
    }
    setMatchStatus(item, basis, CourseRequest_1.AIMatchStatus.IN_PROGRESS);
    if (basis === 'outline' || !item.uploadedOutline?.text) {
        item.status = CourseRequest_1.CourseRequestItemStatus.PENDING;
        item.decidedAt = null;
    }
    request.status = CourseRequest_1.CourseRequestStatus.UNDER_REVIEW;
    await request.save();
    await (0, exports.autoMatchRequestItems)(requestId, [itemId], basis);
    return hydrateById(requestId);
};
exports.rerunAutoMatch = rerunAutoMatch;
const submitAdvisorDecision = async (requestId, advisorComment, itemDecisions, wholeRequestDecision) => {
    ensureValidObjectId(requestId, 'Invalid course request ID.');
    const request = await CourseRequest_1.default.findById(requestId);
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
    }
    else {
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
    const hydratedRequest = await CourseRequest_1.default.findById(requestId)
        .populate(coursePopulate)
        .populate('studentId', 'name email sapId');
    const hydrated = await hydrateRequest(hydratedRequest);
    if (hydrated && [CourseRequest_1.CourseRequestStatus.APPROVED, CourseRequest_1.CourseRequestStatus.REJECTED].includes(hydrated.status)) {
        await createStudentNotification(hydrated);
    }
    return hydrated;
};
exports.submitAdvisorDecision = submitAdvisorDecision;
