"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdvisorProfile = exports.reviewApplication = exports.getAssignedStudents = exports.getAssignedApplications = void 0;
const Application_1 = __importDefault(require("../models/Application"));
const AdvisorProfile_1 = __importDefault(require("../models/AdvisorProfile"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
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
const reviewApplication = async (applicationId, status) => {
    return await Application_1.default.findByIdAndUpdate(applicationId, { status }, { new: true });
};
exports.reviewApplication = reviewApplication;
const getAdvisorProfile = async (userId) => {
    return await AdvisorProfile_1.default.findOne({ userId }).populate('userId', '-password');
};
exports.getAdvisorProfile = getAdvisorProfile;
