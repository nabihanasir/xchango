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
exports.submitAdvisorDecision = exports.runMatch = exports.updateHomeCourseSelection = exports.getAdvisorRequestById = exports.getAdvisorRequests = exports.getStudentRequests = exports.createStudentRequest = exports.getHomeCourses = exports.getHostCourses = void 0;
const response_1 = require("../utils/response");
const courseEquivalencyService = __importStar(require("../services/courseEquivalencyService"));
const getHostCourses = async (_req, res) => {
    const courses = await courseEquivalencyService.listHostCourses();
    (0, response_1.sendResponse)(res, 200, 'Host courses fetched successfully', courses);
};
exports.getHostCourses = getHostCourses;
const getHomeCourses = async (_req, res) => {
    const courses = await courseEquivalencyService.listHomeCourses();
    (0, response_1.sendResponse)(res, 200, 'Home courses fetched successfully', courses);
};
exports.getHomeCourses = getHomeCourses;
const createStudentRequest = async (req, res) => {
    const request = await courseEquivalencyService.createCourseRequest(req.user._id.toString(), req.body.hostCourseIds || []);
    (0, response_1.sendResponse)(res, 201, 'Course equivalency request submitted successfully', request);
};
exports.createStudentRequest = createStudentRequest;
const getStudentRequests = async (req, res) => {
    const requests = await courseEquivalencyService.getStudentRequests(req.user._id.toString());
    (0, response_1.sendResponse)(res, 200, 'Student course requests fetched successfully', requests);
};
exports.getStudentRequests = getStudentRequests;
const getAdvisorRequests = async (_req, res) => {
    const requests = await courseEquivalencyService.getAdvisorRequests();
    (0, response_1.sendResponse)(res, 200, 'Advisor requests fetched successfully', requests);
};
exports.getAdvisorRequests = getAdvisorRequests;
const getAdvisorRequestById = async (req, res) => {
    const request = await courseEquivalencyService.getAdvisorRequestById(req.params.id);
    (0, response_1.sendResponse)(res, 200, 'Advisor request fetched successfully', request);
};
exports.getAdvisorRequestById = getAdvisorRequestById;
const updateHomeCourseSelection = async (req, res) => {
    const request = await courseEquivalencyService.updatePairedHomeCourse(req.params.id, req.params.itemId, req.body.homeCourseId);
    (0, response_1.sendResponse)(res, 200, 'Paired home course updated successfully', request);
};
exports.updateHomeCourseSelection = updateHomeCourseSelection;
const runMatch = async (req, res) => {
    const request = await courseEquivalencyService.runCourseMatch(req.params.id, req.params.itemId);
    (0, response_1.sendResponse)(res, 200, 'AI course match completed successfully', request);
};
exports.runMatch = runMatch;
const submitAdvisorDecision = async (req, res) => {
    const wholeRequestDecision = req.body.wholeRequestDecision;
    const request = await courseEquivalencyService.submitAdvisorDecision(req.params.id, req.body.advisorComment || '', req.body.itemDecisions || [], wholeRequestDecision);
    (0, response_1.sendResponse)(res, 200, 'Advisor decision submitted successfully', request);
};
exports.submitAdvisorDecision = submitAdvisorDecision;
