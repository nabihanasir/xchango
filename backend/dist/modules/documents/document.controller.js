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
exports.updateDocumentReviewStatus = exports.deleteDocumentById = exports.getStudentDocuments = exports.uploadDocument = void 0;
const AppError_1 = require("../../errors/AppError");
const User_1 = require("../../models/User");
const applicationService = __importStar(require("../../services/applicationService"));
const response_1 = require("../../utils/response");
const upload_1 = require("../../utils/upload");
const document_service_1 = require("./document.service");
const isDocumentOwner = (req, studentId) => req.user.role === User_1.UserRole.STUDENT && req.user._id.toString() !== studentId;
const assertViewAccess = async (req, studentId) => {
    if (req.user.role === User_1.UserRole.ADMIN) {
        return;
    }
    if (req.user.role === User_1.UserRole.STUDENT) {
        if (isDocumentOwner(req, studentId)) {
            throw new AppError_1.ForbiddenError('You are not authorized to access these documents.', 'The requested document records belong to another student.', 'Use the correct student account to manage these documents.', 'DOCUMENT_ACCESS_DENIED');
        }
        return;
    }
    if (req.user.role === User_1.UserRole.ADVISOR) {
        const canAccess = await applicationService.advisorCanAccessStudent(req.user._id.toString(), studentId);
        if (!canAccess) {
            throw new AppError_1.ForbiddenError('You are not authorized to access these documents.', 'The requested student is not assigned to the current advisor.', 'Open a student assigned to you or contact an administrator.', 'DOCUMENT_ACCESS_DENIED');
        }
        return;
    }
    throw new AppError_1.ForbiddenError('You are not authorized to access these documents.', 'The current user role cannot access document records.', 'Use a student, advisor, or admin account with valid access.', 'DOCUMENT_ACCESS_DENIED');
};
const assertWriteAccess = async (req, studentId) => {
    if (req.user.role === User_1.UserRole.ADMIN) {
        return;
    }
    if (req.user.role === User_1.UserRole.STUDENT && !isDocumentOwner(req, studentId)) {
        throw new AppError_1.ForbiddenError('You are not authorized to access these documents.', 'The requested document records belong to another student.', 'Use the correct student account to manage these documents.', 'DOCUMENT_ACCESS_DENIED');
    }
    if (req.user.role !== User_1.UserRole.STUDENT) {
        throw new AppError_1.ForbiddenError('You are not authorized to upload documents.', 'Only students and administrators can upload student documents.', 'Use a student or admin account to upload a document.', 'DOCUMENT_UPLOAD_DENIED');
    }
};
const assertStatusAccess = async (req, studentId) => {
    if (req.user.role === User_1.UserRole.ADMIN) {
        return;
    }
    if (req.user.role === User_1.UserRole.ADVISOR) {
        const canAccess = await applicationService.advisorCanAccessStudent(req.user._id.toString(), studentId);
        if (!canAccess) {
            throw new AppError_1.ForbiddenError('You are not authorized to review these documents.', 'The requested student is not assigned to the current advisor.', 'Open a student assigned to you or contact an administrator.', 'DOCUMENT_REVIEW_DENIED');
        }
        return;
    }
    throw new AppError_1.ForbiddenError('You are not authorized to review these documents.', 'Only advisors and administrators can approve or reject documents.', 'Use an advisor or admin account to review documents.', 'DOCUMENT_REVIEW_DENIED');
};
const uploadDocument = async (req, res) => {
    if (!req.file) {
        throw new AppError_1.ValidationError('Please upload a document file.', 'No document file was included in the request.', 'Attach a file and try again.', 'DOCUMENT_FILE_REQUIRED');
    }
    const requestedStudentId = String(req.body.studentId || '').trim();
    const studentId = req.user.role === User_1.UserRole.ADMIN ? requestedStudentId : requestedStudentId || req.user._id.toString();
    if (req.user.role === User_1.UserRole.ADMIN && !studentId) {
        throw new AppError_1.ValidationError('Student ID is required.', 'Administrator uploads must be associated with a student account.', 'Provide the studentId and try again.', 'STUDENT_ID_REQUIRED');
    }
    await assertWriteAccess(req, studentId);
    const type = String(req.body.type || req.body.documentType || '').trim();
    if (!type) {
        throw new AppError_1.ValidationError('Document type is required.', 'The request did not specify the document type.', 'Provide the document type and try again.', 'DOCUMENT_TYPE_REQUIRED');
    }
    const document = await (0, document_service_1.createDocument)({
        studentId,
        type,
        fileUrl: (0, upload_1.toPublicFileUrl)(req.file.path),
        fileName: req.file.originalname,
        status: 'pending',
    });
    (0, response_1.sendResponse)(res, 201, 'Document uploaded successfully', document);
};
exports.uploadDocument = uploadDocument;
const getStudentDocuments = async (req, res) => {
    const studentId = req.params.studentId;
    await assertViewAccess(req, studentId);
    const documents = await (0, document_service_1.getDocumentsForStudent)(studentId);
    (0, response_1.sendResponse)(res, 200, 'Documents fetched successfully', documents);
};
exports.getStudentDocuments = getStudentDocuments;
const deleteDocumentById = async (req, res) => {
    const document = await (0, document_service_1.getDocumentById)(req.params.id);
    if (req.user.role === User_1.UserRole.ADMIN) {
        const deletedDocument = await (0, document_service_1.deleteDocument)(req.params.id);
        (0, response_1.sendResponse)(res, 200, 'Document deleted successfully', deletedDocument);
        return;
    }
    if (req.user.role === User_1.UserRole.STUDENT && document.studentId.toString() !== req.user._id.toString()) {
        throw new AppError_1.ForbiddenError('You are not authorized to delete this document.', 'The requested document belongs to another student.', 'Use the correct student account to delete documents.', 'DOCUMENT_DELETE_DENIED');
    }
    if (req.user.role === User_1.UserRole.ADVISOR) {
        throw new AppError_1.ForbiddenError('You are not authorized to delete this document.', 'Advisors can review documents but cannot delete them.', 'Use an admin account if a document needs to be removed.', 'DOCUMENT_DELETE_DENIED');
    }
    if (req.user.role !== User_1.UserRole.STUDENT) {
        throw new AppError_1.ForbiddenError('You are not authorized to delete this document.', 'The current user role cannot delete student documents.', 'Use a student or admin account to remove a document.', 'DOCUMENT_DELETE_DENIED');
    }
    const deletedDocument = await (0, document_service_1.deleteDocument)(req.params.id);
    (0, response_1.sendResponse)(res, 200, 'Document deleted successfully', deletedDocument);
};
exports.deleteDocumentById = deleteDocumentById;
const updateDocumentReviewStatus = async (req, res) => {
    const document = await (0, document_service_1.getDocumentById)(req.params.id);
    await assertStatusAccess(req, document.studentId.toString());
    const status = String(req.body.status || '').toLowerCase();
    if (!['pending', 'approved', 'rejected'].includes(status)) {
        throw new AppError_1.ValidationError('Invalid document status.', 'The provided status is not supported.', 'Use pending, approved, or rejected.', 'DOCUMENT_STATUS_INVALID');
    }
    const updatedDocument = await (0, document_service_1.updateDocumentStatus)(req.params.id, status);
    (0, response_1.sendResponse)(res, 200, 'Document status updated successfully', updatedDocument);
};
exports.updateDocumentReviewStatus = updateDocumentReviewStatus;
