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
exports.getAllResultsForAdmin = exports.upsertResult = exports.getAdvisorGradableItems = exports.getStudentResults = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Application_1 = __importDefault(require("../models/Application"));
const CourseRequest_1 = __importStar(require("../models/CourseRequest"));
const Notification_1 = __importDefault(require("../models/Notification"));
const Result_1 = __importStar(require("../models/Result"));
const applicationService_1 = require("./applicationService");
const ensureValidObjectId = (value, message) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(value)) {
        throw new Error(message);
    }
};
const createStudentNotification = async (result) => {
    await Notification_1.default.create({
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
const getStudentResults = async (studentId) => Result_1.default.find({ studentId, status: Result_1.ResultStatus.PUBLISHED })
    .populate('hostCourseId')
    .populate('advisorId', 'name email')
    .sort({ updatedAt: -1 });
exports.getStudentResults = getStudentResults;
const getAdvisorGradableItems = async (advisorId) => {
    const studentIds = await Application_1.default.distinct('studentId', { advisorId });
    if (!studentIds.length) {
        return [];
    }
    const requests = await CourseRequest_1.default.find({ studentId: { $in: studentIds } })
        .populate('items.hostCourseId')
        .populate('studentId', 'name email sapId');
    const approvedItems = requests.flatMap((request) => request.items
        .filter((item) => item.status === CourseRequest_1.CourseRequestItemStatus.APPROVED)
        .map((item) => ({ request, item })));
    if (!approvedItems.length) {
        return [];
    }
    const results = await Result_1.default.find({
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
exports.getAdvisorGradableItems = getAdvisorGradableItems;
const upsertResult = async (advisorId, courseRequestItemId, input) => {
    ensureValidObjectId(courseRequestItemId, 'Invalid course request item ID.');
    const request = await CourseRequest_1.default.findOne({ 'items._id': courseRequestItemId });
    if (!request) {
        throw new Error('Enrolled course could not be found.');
    }
    const item = request.items.id(courseRequestItemId);
    if (!item) {
        throw new Error('Enrolled course could not be found.');
    }
    if (item.status !== CourseRequest_1.CourseRequestItemStatus.APPROVED) {
        throw new Error('This course is not an approved enrollment yet.');
    }
    const canAccess = await (0, applicationService_1.advisorCanAccessStudent)(advisorId, request.studentId.toString());
    if (!canAccess) {
        throw new Error('You are not assigned to this student.');
    }
    const update = {
        studentId: request.studentId,
        courseRequestItemId: item._id,
        hostCourseId: item.hostCourseId,
        advisorId,
        grade: input.grade,
        marks: input.marks ?? null,
        remarks: input.remarks || '',
        status: input.status,
        publishedAt: input.status === Result_1.ResultStatus.PUBLISHED ? new Date() : null,
    };
    if (input.resultFileUrl) {
        update.resultFileUrl = input.resultFileUrl;
    }
    const result = await Result_1.default.findOneAndUpdate({ courseRequestItemId: item._id }, update, { upsert: true, new: true, setDefaultsOnInsert: true });
    if (result.status === Result_1.ResultStatus.PUBLISHED) {
        await createStudentNotification(result);
    }
    return Result_1.default.findById(result._id).populate('hostCourseId').populate('advisorId', 'name email');
};
exports.upsertResult = upsertResult;
const getAllResultsForAdmin = async () => Result_1.default.find()
    .populate('studentId', 'name email')
    .populate('hostCourseId')
    .populate('advisorId', 'name email')
    .sort({ updatedAt: -1 });
exports.getAllResultsForAdmin = getAllResultsForAdmin;
