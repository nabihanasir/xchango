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
exports.getTranscript = exports.uploadTranscript = void 0;
const AppError_1 = require("../errors/AppError");
const User_1 = require("../models/User");
const transcriptParser_1 = require("../services/transcriptParser");
const studentService = __importStar(require("../services/studentService"));
const response_1 = require("../utils/response");
const upload_1 = require("../utils/upload");
const assertStudentAccess = (req, studentId) => {
    if (req.user.role === User_1.UserRole.STUDENT && req.user._id.toString() !== studentId) {
        throw new AppError_1.ForbiddenError('You are not authorized to access this transcript.', 'The requested transcript belongs to another student.', 'Use the correct student account to access this transcript.', 'TRANSCRIPT_ACCESS_DENIED');
    }
};
const uploadTranscript = async (req, res) => {
    if (!req.file) {
        throw new AppError_1.ValidationError('Please upload a transcript file.', 'No transcript file was included in the request.', 'Attach a transcript file and try again.', 'TRANSCRIPT_FILE_REQUIRED');
    }
    const studentId = req.body.studentId || req.user._id.toString();
    assertStudentAccess(req, studentId);
    const transcript = (0, transcriptParser_1.parseTranscriptFile)(req.file.path);
    transcript.fileUrl = (0, upload_1.toPublicFileUrl)(req.file.path);
    const savedTranscript = await studentService.saveTranscript(studentId, transcript);
    (0, response_1.sendResponse)(res, 201, 'Transcript uploaded and parsed successfully', savedTranscript);
};
exports.uploadTranscript = uploadTranscript;
const getTranscript = async (req, res) => {
    const studentId = req.params.studentId;
    assertStudentAccess(req, studentId);
    const transcript = await studentService.getTranscript(studentId);
    (0, response_1.sendResponse)(res, 200, 'Transcript fetched successfully', transcript);
};
exports.getTranscript = getTranscript;
