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
exports.getProfile = exports.updateApplicationStatus = exports.getAssignedStudents = exports.getAssignedApps = void 0;
const advisorService = __importStar(require("../services/advisorService"));
const response_1 = require("../utils/response");
const getAssignedApps = async (req, res) => {
    const applications = await advisorService.getAssignedApplications(req.user._id);
    (0, response_1.sendResponse)(res, 200, 'Assigned applications fetched', applications);
};
exports.getAssignedApps = getAssignedApps;
const getAssignedStudents = async (req, res) => {
    const students = await advisorService.getAssignedStudents(req.user._id);
    (0, response_1.sendResponse)(res, 200, 'Assigned students fetched', students);
};
exports.getAssignedStudents = getAssignedStudents;
const updateApplicationStatus = async (req, res) => {
    const { status } = req.body;
    const application = await advisorService.reviewApplication(req.params.id, req.user._id.toString(), status);
    (0, response_1.sendResponse)(res, 200, 'Application status updated', application);
};
exports.updateApplicationStatus = updateApplicationStatus;
const getProfile = async (req, res) => {
    const profile = await advisorService.getAdvisorProfile(req.user._id);
    (0, response_1.sendResponse)(res, 200, 'Advisor profile fetched', profile);
};
exports.getProfile = getProfile;
