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
exports.getAdvisorProfile = exports.reviewApplication = exports.getAssignedStudents = exports.getAssignedApplications = void 0;
const Application_1 = __importDefault(require("../models/Application"));
const AdvisorProfile_1 = __importDefault(require("../models/AdvisorProfile"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const applicationService = __importStar(require("./applicationService"));
const getAssignedApplications = async (advisorId) => {
    return await Application_1.default.find({
        advisorId,
    }).populate('studentId', 'name email sapId');
};
exports.getAssignedApplications = getAssignedApplications;
const getAssignedStudents = async (advisorId) => {
    const applications = await Application_1.default.find({ advisorId }).select('studentId');
    const studentIds = Array.from(new Set(applications.map((application) => application.studentId.toString())));
    return StudentProfile_1.default.find({ userId: { $in: studentIds } }).sort({ updatedAt: -1 });
};
exports.getAssignedStudents = getAssignedStudents;
const reviewApplication = async (applicationId, advisorId, status) => {
    return applicationService.updateStatus(applicationId, advisorId, status);
};
exports.reviewApplication = reviewApplication;
const getAdvisorProfile = async (userId) => {
    return await AdvisorProfile_1.default.findOne({ userId }).populate('userId', '-password');
};
exports.getAdvisorProfile = getAdvisorProfile;
