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
exports.deleteDocument = exports.getStudentDocuments = exports.uploadDocument = void 0;
const User_1 = require("../models/User");
const studentService = __importStar(require("../services/studentService"));
const response_1 = require("../utils/response");
const upload_1 = require("../utils/upload");
const assertStudentAccess = (req, studentId) => {
    if (req.user.role === User_1.UserRole.STUDENT && req.user._id.toString() !== studentId) {
        throw new Error('You are not authorized to access these documents.');
    }
};
const uploadDocument = async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('Please upload a document file.');
    }
    const studentId = req.body.studentId || req.user._id.toString();
    assertStudentAccess(req, studentId);
    const type = req.body.type || req.body.documentType;
    if (!type) {
        res.status(400);
        throw new Error('Document type is required.');
    }
    const documents = await studentService.addDocument(studentId, {
        type,
        status: req.body.status || 'pending',
        fileUrl: (0, upload_1.toPublicFileUrl)(req.file.path),
    });
    (0, response_1.sendResponse)(res, 201, 'Document uploaded successfully', documents);
};
exports.uploadDocument = uploadDocument;
const getStudentDocuments = async (req, res) => {
    const studentId = req.params.studentId;
    assertStudentAccess(req, studentId);
    const documents = await studentService.getDocuments(studentId);
    (0, response_1.sendResponse)(res, 200, 'Documents fetched successfully', documents);
};
exports.getStudentDocuments = getStudentDocuments;
const deleteDocument = async (req, res) => {
    const documents = await studentService.removeDocument(req.user._id.toString(), req.params.docId);
    (0, response_1.sendResponse)(res, 200, 'Document deleted successfully', documents);
};
exports.deleteDocument = deleteDocument;
