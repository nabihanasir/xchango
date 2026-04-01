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
exports.selectCourses = exports.uploadDocuments = exports.updateStatus = exports.scheduleInterview = exports.getAdvisorApplications = exports.assignAdvisor = exports.submitApplication = exports.getStudentApplications = exports.getApplication = exports.updateApplicationStep = exports.createApplication = void 0;
const User_1 = require("../models/User");
const applicationService = __importStar(require("../services/applicationService"));
const response_1 = require("../utils/response");
const upload_1 = require("../utils/upload");
const assertStudentAccess = (req, studentId) => {
    if (req.user.role === User_1.UserRole.STUDENT && req.user._id.toString() !== studentId) {
        throw new Error('You are not authorized to access these applications.');
    }
};
const createApplication = async (req, res) => {
    const studentId = req.body.studentId || req.user._id.toString();
    assertStudentAccess(req, studentId);
    const application = await applicationService.createApplication(studentId, req.body);
    (0, response_1.sendResponse)(res, 201, 'Application draft created successfully', application);
};
exports.createApplication = createApplication;
const updateApplicationStep = async (req, res) => {
    const application = await applicationService.updateApplicationStep(req.params.id, req.user._id.toString(), req.body);
    (0, response_1.sendResponse)(res, 200, 'Application step updated successfully', application);
};
exports.updateApplicationStep = updateApplicationStep;
const getApplication = async (req, res) => {
    const application = await applicationService.getApplicationById(req.params.id, {
        _id: req.user._id.toString(),
        role: req.user.role,
    });
    (0, response_1.sendResponse)(res, 200, 'Application fetched successfully', application);
};
exports.getApplication = getApplication;
const getStudentApplications = async (req, res) => {
    const studentId = req.params.studentId;
    assertStudentAccess(req, studentId);
    const applications = await applicationService.getStudentApplications(studentId);
    (0, response_1.sendResponse)(res, 200, 'Applications fetched successfully', applications);
};
exports.getStudentApplications = getStudentApplications;
const submitApplication = async (req, res) => {
    const result = await applicationService.submitApplication(req.params.id, req.user._id.toString());
    const warningSuffix = result.warnings.length ? ` Warning: ${result.warnings.join(' ')}` : '';
    (0, response_1.sendResponse)(res, 200, `Application submitted successfully.${warningSuffix}`, result.application);
};
exports.submitApplication = submitApplication;
const assignAdvisor = async (req, res) => {
    const application = await applicationService.assignAdvisor(req.params.id, req.body.advisorId);
    (0, response_1.sendResponse)(res, 200, 'Advisor assigned successfully', application);
};
exports.assignAdvisor = assignAdvisor;
const getAdvisorApplications = async (req, res) => {
    const applications = await applicationService.getAdvisorApplications(req.user._id.toString());
    (0, response_1.sendResponse)(res, 200, 'Assigned applications fetched successfully', applications);
};
exports.getAdvisorApplications = getAdvisorApplications;
const scheduleInterview = async (req, res) => {
    const application = await applicationService.scheduleInterview(req.params.id, req.user._id.toString(), req.body);
    (0, response_1.sendResponse)(res, 200, 'Interview scheduled successfully', application);
};
exports.scheduleInterview = scheduleInterview;
const updateStatus = async (req, res) => {
    const application = await applicationService.updateStatus(req.params.id, req.user._id.toString(), req.body.status);
    (0, response_1.sendResponse)(res, 200, 'Application status updated successfully', application);
};
exports.updateStatus = updateStatus;
const uploadDocuments = async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400);
        throw new Error('Upload at least one application document.');
    }
    const documents = req.files.map((file) => ({
        type: req.body.type || 'supporting_document',
        fileUrl: (0, upload_1.toPublicFileUrl)(file.path),
    }));
    const application = await applicationService.uploadDocuments(req.params.id, req.user._id.toString(), documents);
    (0, response_1.sendResponse)(res, 200, 'Application documents uploaded successfully', application);
};
exports.uploadDocuments = uploadDocuments;
const selectCourses = async (req, res) => {
    const courseNames = Array.isArray(req.body.courseNames) ? req.body.courseNames : [];
    const application = await applicationService.selectCourses(req.params.id, req.user._id.toString(), courseNames);
    (0, response_1.sendResponse)(res, 200, 'Application courses selected successfully', application);
};
exports.selectCourses = selectCourses;
