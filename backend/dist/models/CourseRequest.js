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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIMatchStatus = exports.CourseRequestItemStatus = exports.CourseRequestStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var CourseRequestStatus;
(function (CourseRequestStatus) {
    CourseRequestStatus["PENDING"] = "pending";
    CourseRequestStatus["UNDER_REVIEW"] = "under_review";
    CourseRequestStatus["APPROVED"] = "approved";
    CourseRequestStatus["REJECTED"] = "rejected";
})(CourseRequestStatus || (exports.CourseRequestStatus = CourseRequestStatus = {}));
var CourseRequestItemStatus;
(function (CourseRequestItemStatus) {
    CourseRequestItemStatus["PENDING"] = "pending";
    CourseRequestItemStatus["APPROVED"] = "approved";
    CourseRequestItemStatus["REJECTED"] = "rejected";
})(CourseRequestItemStatus || (exports.CourseRequestItemStatus = CourseRequestItemStatus = {}));
var AIMatchStatus;
(function (AIMatchStatus) {
    AIMatchStatus["NOT_STARTED"] = "not_started";
    AIMatchStatus["COMPLETED"] = "completed";
    AIMatchStatus["FAILED"] = "failed";
})(AIMatchStatus || (exports.AIMatchStatus = AIMatchStatus = {}));
const CourseRequestItemSchema = new mongoose_1.Schema({
    hostCourseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Course', required: true },
    homeCourseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Course', default: null },
    status: {
        type: String,
        enum: Object.values(CourseRequestItemStatus),
        default: CourseRequestItemStatus.PENDING,
    },
    advisorComment: { type: String, default: '' },
    aiMatchStatus: {
        type: String,
        enum: Object.values(AIMatchStatus),
        default: AIMatchStatus.NOT_STARTED,
    },
    aiMatchError: { type: String, default: null },
    decidedAt: { type: Date, default: null },
}, { _id: true });
const CourseRequestSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: Object.values(CourseRequestStatus),
        default: CourseRequestStatus.PENDING,
    },
    advisorComment: { type: String, default: '' },
    items: {
        type: [CourseRequestItemSchema],
        validate: {
            validator: (items) => items.length > 0,
            message: 'At least one host course must be selected.',
        },
    },
}, {
    timestamps: {
        createdAt: 'submittedAt',
        updatedAt: 'updatedAt',
    },
});
exports.default = mongoose_1.default.model('CourseRequest', CourseRequestSchema);
