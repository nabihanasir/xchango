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
exports.updateAdvisorProfile = exports.getAdvisorProfile = exports.reviewApplication = exports.getAssignedStudents = exports.getAssignedApplications = void 0;
const Application_1 = __importDefault(require("../models/Application"));
const AdvisorProfile_1 = __importDefault(require("../models/AdvisorProfile"));
const StudentProfile_1 = __importDefault(require("../models/StudentProfile"));
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = require("../errors/AppError");
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
const readText = (value, label, max, required) => {
    if (value === undefined)
        return undefined;
    if (typeof value !== 'string') {
        throw new AppError_1.ValidationError(`${label} must be text.`, `The ${label.toLowerCase()} value sent was not a string.`, `Enter ${label.toLowerCase()} as plain text.`);
    }
    const trimmed = value.trim();
    if (required && !trimmed) {
        throw new AppError_1.ValidationError(`${label} is required.`, `The ${label.toLowerCase()} field was empty.`, `Enter a value for ${label.toLowerCase()}.`);
    }
    if (trimmed.length > max) {
        throw new AppError_1.ValidationError(`${label} must be at most ${max} characters.`, `The ${label.toLowerCase()} value is too long.`, `Shorten ${label.toLowerCase()} to ${max} characters or fewer.`);
    }
    return trimmed;
};
const updateAdvisorProfile = async (userId, input) => {
    const profile = await AdvisorProfile_1.default.findOne({ userId });
    if (!profile) {
        throw new AppError_1.NotFoundError('Advisor profile not found.', 'No advisor profile is linked to this account.', 'Contact an administrator to set up your advisor profile.');
    }
    const name = readText(input.name, 'Name', 100, true);
    const designation = readText(input.designation, 'Designation', 100, true);
    const department = readText(input.department, 'Department', 100, true);
    const phone = readText(input.phone, 'Phone', 30, false);
    const bio = readText(input.bio, 'Bio', 1000, false);
    const officeHours = readText(input.officeHours, 'Office hours', 200, false);
    if (name !== undefined) {
        await User_1.default.findByIdAndUpdate(userId, { name });
    }
    if (designation !== undefined)
        profile.designation = designation;
    if (department !== undefined)
        profile.department = department;
    if (phone !== undefined)
        profile.phone = phone;
    if (bio !== undefined)
        profile.bio = bio;
    if (officeHours !== undefined)
        profile.officeHours = officeHours;
    await profile.save();
    return (0, exports.getAdvisorProfile)(userId);
};
exports.updateAdvisorProfile = updateAdvisorProfile;
