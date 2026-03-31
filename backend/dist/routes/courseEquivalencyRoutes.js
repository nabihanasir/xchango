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
const courseEquivalencyController = __importStar(require("../controllers/courseEquivalencyController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect);
router.get('/host-courses', (0, authMiddleware_1.authorize)(User_1.UserRole.STUDENT, User_1.UserRole.ADVISOR, User_1.UserRole.ADMIN), courseEquivalencyController.getHostCourses);
router.get('/home-courses', (0, authMiddleware_1.authorize)(User_1.UserRole.ADVISOR, User_1.UserRole.ADMIN), courseEquivalencyController.getHomeCourses);
router.get('/student/requests', (0, authMiddleware_1.authorize)(User_1.UserRole.STUDENT), courseEquivalencyController.getStudentRequests);
router.post('/student/requests', (0, authMiddleware_1.authorize)(User_1.UserRole.STUDENT), courseEquivalencyController.createStudentRequest);
router.get('/advisor/requests', (0, authMiddleware_1.authorize)(User_1.UserRole.ADVISOR), courseEquivalencyController.getAdvisorRequests);
router.get('/advisor/requests/:id', (0, authMiddleware_1.authorize)(User_1.UserRole.ADVISOR), courseEquivalencyController.getAdvisorRequestById);
router.put('/advisor/requests/:id/items/:itemId/home-course', (0, authMiddleware_1.authorize)(User_1.UserRole.ADVISOR), courseEquivalencyController.updateHomeCourseSelection);
router.post('/advisor/requests/:id/items/:itemId/run-match', (0, authMiddleware_1.authorize)(User_1.UserRole.ADVISOR), courseEquivalencyController.runMatch);
router.put('/advisor/requests/:id/decision', (0, authMiddleware_1.authorize)(User_1.UserRole.ADVISOR), courseEquivalencyController.submitAdvisorDecision);
exports.default = router;
