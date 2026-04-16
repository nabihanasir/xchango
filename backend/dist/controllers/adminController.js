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
exports.getCourseMappings = exports.addCourseMapping = exports.uploadOfferLetter = exports.createUser = exports.getPendingApplications = exports.getApplications = exports.getUsers = exports.addCourse = exports.addUniversity = exports.getDashboardStats = void 0;
const adminService = __importStar(require("../services/adminService"));
const response_1 = require("../utils/response");
const getDashboardStats = async (req, res) => {
    const stats = await adminService.getAllStats();
    (0, response_1.sendResponse)(res, 200, 'Dashboard stats fetched', stats);
};
exports.getDashboardStats = getDashboardStats;
const addUniversity = async (req, res) => {
    const university = await adminService.createUniversity(req.body);
    (0, response_1.sendResponse)(res, 201, 'University added successfully', university);
};
exports.addUniversity = addUniversity;
const addCourse = async (req, res) => {
    const course = await adminService.createCourse(req.user._id.toString(), req.body);
    (0, response_1.sendResponse)(res, 201, 'Course added successfully', course);
};
exports.addCourse = addCourse;
const getUsers = async (req, res) => {
    const users = await adminService.getAllUsers();
    (0, response_1.sendResponse)(res, 200, 'Users fetched successfully', users);
};
exports.getUsers = getUsers;
const getApplications = async (_req, res) => {
    const applications = await adminService.getAllApplications();
    (0, response_1.sendResponse)(res, 200, 'Applications fetched successfully', applications);
};
exports.getApplications = getApplications;
const getPendingApplications = async (_req, res) => {
    const applications = await adminService.getPendingApplications();
    (0, response_1.sendResponse)(res, 200, 'Pending applications fetched successfully', applications);
};
exports.getPendingApplications = getPendingApplications;
const createUser = async (req, res) => {
    const user = await adminService.createUser(req.body);
    (0, response_1.sendResponse)(res, 201, 'User created successfully', user);
};
exports.createUser = createUser;
const uploadOfferLetter = async (req, res) => {
    const { applicationId, offerLetterUrl } = req.body;
    const application = await adminService.updateApplicationOfferLetter(applicationId, offerLetterUrl);
    (0, response_1.sendResponse)(res, 200, 'Offer letter uploaded successfully', application);
};
exports.uploadOfferLetter = uploadOfferLetter;
const addCourseMapping = async (req, res) => {
    const { homeCourseId, hostCourseId, applicationId } = req.body;
    const mapping = await adminService.createMapping(homeCourseId, hostCourseId, applicationId);
    (0, response_1.sendResponse)(res, 201, 'Course mapping added', mapping);
};
exports.addCourseMapping = addCourseMapping;
const getCourseMappings = async (req, res) => {
    const mappings = await adminService.getAllMappings();
    (0, response_1.sendResponse)(res, 200, 'Course mappings fetched', mappings);
};
exports.getCourseMappings = getCourseMappings;
