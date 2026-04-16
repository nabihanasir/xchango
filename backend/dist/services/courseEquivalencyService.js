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
exports.submitAdvisorDecision = exports.runCourseMatch = exports.updatePairedHomeCourse = exports.getAdvisorRequestById = exports.getAdvisorRequests = exports.getStudentRequests = exports.createCourseRequest = exports.listHomeCourses = exports.listHostCourses = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Course_1 = __importStar(require("../models/Course"));
const CourseMatchResult_1 = __importDefault(require("../models/CourseMatchResult"));
const CourseRequest_1 = __importStar(require("../models/CourseRequest"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const Notification_1 = __importDefault(require("../models/Notification"));
const aiCourseMatcherService_1 = require("./aiCourseMatcherService");
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
const findSuggestedHomeCourse = async (hostCourse) => {
    const homeCourses = await Course_1.default.find({ $or: [{ isHomeCourse: true }, { type: Course_1.CourseType.HOME }] });
    if (!homeCourses.length) {
        return null;
    }
    let bestMatch = null;
    let bestScore = -1;
    homeCourses.forEach((candidate) => {
        const currentScore = (calculateTextFit(hostCourse.name, candidate.name) * 0.45) +
            (calculateTextFit(hostCourse.description || '', candidate.description || '') * 0.2) +
            (calculateTextFit(hostCourse.outlineText || '', candidate.outlineText || '') * 0.35);
        if (currentScore > bestScore) {
            bestMatch = candidate;
            bestScore = currentScore;
        }
    });
    return bestMatch;
};
const calculateTextFit = (left, right) => {
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
    await Notification_1.default.create({
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
const listHostCourses = async () => Course_1.default.find({ type: Course_1.CourseType.HOST }).populate('universityId', 'name').sort({ code: 1 });
exports.listHostCourses = listHostCourses;
const listHomeCourses = async () => Course_1.default.find({ $or: [{ isHomeCourse: true }, { type: Course_1.CourseType.HOME }] })
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
    const items = await Promise.all(hostCourses.map(async (hostCourse) => {
        const suggestedHomeCourse = await findSuggestedHomeCourse(hostCourse);
        return {
            hostCourseId: hostCourse._id,
            homeCourseId: suggestedHomeCourse?._id || null,
        };
    }));
    const request = await CourseRequest_1.default.create({
        studentId,
        status: CourseRequest_1.CourseRequestStatus.PENDING,
        items,
    });
    const hydratedRequest = await CourseRequest_1.default.findById(request._id).populate(coursePopulate).populate('studentId', 'name email');
    return hydrateRequest(hydratedRequest);
};
exports.createCourseRequest = createCourseRequest;
const getStudentRequests = async (studentId) => {
    const requests = await CourseRequest_1.default.find({ studentId })
        .populate(coursePopulate)
        .populate('studentId', 'name email')
        .sort({ submittedAt: -1 });
    return Promise.all(requests.map((request) => hydrateRequest(request)));
};
exports.getStudentRequests = getStudentRequests;
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
const updatePairedHomeCourse = async (requestId, itemId, homeCourseId) => {
    ensureValidObjectId(requestId, 'Invalid course request ID.');
    ensureValidObjectId(itemId, 'Invalid request item ID.');
    ensureValidObjectId(homeCourseId, 'Invalid home course ID.');
    const request = await CourseRequest_1.default.findById(requestId);
    if (!request) {
        throw new Error('Course request not found.');
    }
    const item = request.items.id(itemId);
    if (!item) {
        throw new Error('Course request item not found.');
    }
    const homeCourse = await Course_1.default.findOne({
        _id: homeCourseId,
        $or: [{ isHomeCourse: true }, { type: Course_1.CourseType.HOME }],
    });
    if (!homeCourse) {
        throw new Error('Selected home course could not be found.');
    }
    item.homeCourseId = homeCourse._id;
    item.aiMatchStatus = CourseRequest_1.AIMatchStatus.NOT_STARTED;
    item.aiMatchError = null;
    item.status = CourseRequest_1.CourseRequestItemStatus.PENDING;
    item.advisorComment = '';
    item.decidedAt = null;
    request.status = CourseRequest_1.CourseRequestStatus.UNDER_REVIEW;
    await request.save();
    await CourseMatchResult_1.default.findOneAndDelete({ courseRequestItemId: item._id });
    const hydratedRequest = await CourseRequest_1.default.findById(requestId)
        .populate(coursePopulate)
        .populate('studentId', 'name email sapId');
    return hydrateRequest(hydratedRequest);
};
exports.updatePairedHomeCourse = updatePairedHomeCourse;
const runCourseMatch = async (requestId, itemId) => {
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
    if (!item.homeCourseId) {
        throw new Error('Select a home course before running the AI match.');
    }
    const [hostCourse, homeCourse] = await Promise.all([
        Course_1.default.findById(item.hostCourseId),
        Course_1.default.findById(item.homeCourseId),
    ]);
    if (!hostCourse || !homeCourse) {
        throw new Error('The selected course pair could not be loaded.');
    }
    try {
        const result = await (0, aiCourseMatcherService_1.evaluateCourseMatch)(hostCourse, homeCourse);
        await CourseMatchResult_1.default.findOneAndUpdate({ courseRequestItemId: item._id }, {
            courseRequestId: request._id,
            courseRequestItemId: item._id,
            hostCourseId: hostCourse._id,
            homeCourseId: homeCourse._id,
            matchScore: result.matchScore,
            reasoning: result.reasoning,
        }, { upsert: true, new: true, setDefaultsOnInsert: true });
        item.aiMatchStatus = CourseRequest_1.AIMatchStatus.COMPLETED;
        item.aiMatchError = null;
        request.status = CourseRequest_1.CourseRequestStatus.UNDER_REVIEW;
        await request.save();
    }
    catch (error) {
        item.aiMatchStatus = CourseRequest_1.AIMatchStatus.FAILED;
        item.aiMatchError = error.message;
        request.status = CourseRequest_1.CourseRequestStatus.UNDER_REVIEW;
        await request.save();
        throw error;
    }
    const hydratedRequest = await CourseRequest_1.default.findById(requestId)
        .populate(coursePopulate)
        .populate('studentId', 'name email sapId');
    return hydrateRequest(hydratedRequest);
};
exports.runCourseMatch = runCourseMatch;
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
