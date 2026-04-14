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
exports.updateStudentById = exports.getStudentById = exports.updateProfile = exports.getProfile = void 0;
const AppError_1 = require("../errors/AppError");
const User_1 = require("../models/User");
const studentService = __importStar(require("../services/studentService"));
const applicationService = __importStar(require("../services/applicationService"));
const response_1 = require("../utils/response");
const assertStudentAccess = (req, studentId) => {
    if (req.user.role === User_1.UserRole.STUDENT && req.user._id.toString() !== studentId) {
        throw new AppError_1.ForbiddenError('You are not authorized to access this student profile.', 'The requested student profile belongs to a different user.', 'Open the profile using the correct account or request administrator access.', 'STUDENT_PROFILE_ACCESS_DENIED');
    }
};
const assertStudentReadAccess = async (req, studentId) => {
    if (req.user.role === User_1.UserRole.ADMIN) {
        return;
    }
    if (req.user.role === User_1.UserRole.STUDENT) {
        assertStudentAccess(req, studentId);
        return;
    }
    if (req.user.role === User_1.UserRole.ADVISOR) {
        const canAccess = await applicationService.advisorCanAccessStudent(req.user._id.toString(), studentId);
        if (!canAccess) {
            throw new AppError_1.ForbiddenError('You are not authorized to access this student profile.', 'This student is not assigned to the current advisor.', 'Open a student assigned to you or contact an administrator.', 'STUDENT_PROFILE_ACCESS_DENIED');
        }
        return;
    }
    throw new AppError_1.ForbiddenError('You are not authorized to access this student profile.', 'The current user role cannot access this student profile.', 'Use a student, advisor, or admin account with valid access.', 'STUDENT_PROFILE_ACCESS_DENIED');
};
const assertStudentWriteAccess = (req, studentId) => {
    if (req.user.role === User_1.UserRole.ADMIN) {
        return;
    }
    assertStudentAccess(req, studentId);
};
const getRequestedStudentId = (req) => req.params.id || req.user._id.toString();
const getProfile = async (req, res) => {
    const profile = await studentService.getStudentProfile(req.user._id.toString());
    (0, response_1.sendResponse)(res, 200, 'Student profile fetched', profile);
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    const profile = await studentService.updateStudentProfile(req.user._id.toString(), req.body);
    (0, response_1.sendResponse)(res, 200, 'Student profile updated', profile);
};
exports.updateProfile = updateProfile;
const getStudentById = async (req, res) => {
    const studentId = getRequestedStudentId(req);
    await assertStudentReadAccess(req, studentId);
    const profile = await studentService.getStudentProfile(studentId);
    (0, response_1.sendResponse)(res, 200, 'Student profile fetched', profile);
};
exports.getStudentById = getStudentById;
const updateStudentById = async (req, res) => {
    const studentId = getRequestedStudentId(req);
    assertStudentWriteAccess(req, studentId);
    const profile = await studentService.updateStudentProfile(studentId, req.body);
    (0, response_1.sendResponse)(res, 200, 'Student profile updated', profile);
};
exports.updateStudentById = updateStudentById;
