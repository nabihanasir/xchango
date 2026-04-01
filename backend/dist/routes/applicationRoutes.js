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
const express_1 = __importDefault(require("express"));
const applicationController = __importStar(require("../controllers/applicationController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const authorize_1 = require("../middleware/authorize");
const upload_1 = require("../utils/upload");
const User_1 = require("../models/User");
const router = express_1.default.Router();
const applicationDocumentUpload = (0, upload_1.createUploader)('application-documents');
router.use(authMiddleware_1.protect);
router.post('/', (0, authorize_1.authorizeRoles)(User_1.UserRole.STUDENT), applicationController.createApplication);
router.get('/student/:studentId', (0, authorize_1.authorizeRoles)(User_1.UserRole.STUDENT, User_1.UserRole.ADMIN), applicationController.getStudentApplications);
router.get('/advisor', (0, authorize_1.authorizeRoles)(User_1.UserRole.ADVISOR), applicationController.getAdvisorApplications);
router.get('/:id', applicationController.getApplication);
router.patch('/:id', (0, authorize_1.authorizeRoles)(User_1.UserRole.STUDENT), applicationController.updateApplicationStep);
router.post('/:id/submit', (0, authorize_1.authorizeRoles)(User_1.UserRole.STUDENT), applicationController.submitApplication);
router.patch('/:id/assign-advisor', (0, authorize_1.authorizeRoles)(User_1.UserRole.ADMIN), applicationController.assignAdvisor);
router.patch('/:id/schedule-interview', (0, authorize_1.authorizeRoles)(User_1.UserRole.ADVISOR), applicationController.scheduleInterview);
router.post('/:id/interview', (0, authorize_1.authorizeRoles)(User_1.UserRole.ADVISOR), applicationController.scheduleInterview);
router.patch('/:id/status', (0, authorize_1.authorizeRoles)(User_1.UserRole.ADVISOR), applicationController.updateStatus);
router.post('/:id/documents', (0, authorize_1.authorizeRoles)(User_1.UserRole.STUDENT), applicationDocumentUpload.array('files'), applicationController.uploadDocuments);
router.post('/:id/courses', (0, authorize_1.authorizeRoles)(User_1.UserRole.STUDENT), applicationController.selectCourses);
exports.default = router;
