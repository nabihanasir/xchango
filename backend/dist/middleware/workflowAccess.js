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
exports.requireInterviewCompleted = exports.requireCompleteStudentProfile = void 0;
const AppError_1 = require("../errors/AppError");
const applicationService = __importStar(require("../services/applicationService"));
const studentService = __importStar(require("../services/studentService"));
const requireCompleteStudentProfile = async (req, _res, next) => {
    try {
        const studentId = req.user?._id?.toString();
        const profile = await studentService.getStudentProfile(studentId);
        if (!profile.isProfileComplete) {
            const missing = profile.profileCompletionIssues.length
                ? profile.profileCompletionIssues.join(' and ')
                : 'required profile fields';
            throw new AppError_1.ValidationError(`Profile incomplete. Missing ${missing}.`, 'The student profile must be completed before creating an application.', 'Complete the profile and upload the required academic records first.', 'PROFILE_INCOMPLETE');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireCompleteStudentProfile = requireCompleteStudentProfile;
const requireInterviewCompleted = async (req, _res, next) => {
    try {
        const studentId = req.user?._id?.toString();
        const canRequest = await applicationService.studentCanRequestCourseApproval(studentId);
        if (!canRequest) {
            throw new AppError_1.ValidationError('Interview not completed yet.', 'You must complete your advisor interview before requesting course approval.', 'Wait until your advisor marks the interview completed, then try again.', 'INTERVIEW_NOT_COMPLETED');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireInterviewCompleted = requireInterviewCompleted;
