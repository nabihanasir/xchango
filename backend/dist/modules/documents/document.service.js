"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.updateDocumentStatus = exports.getDocumentById = exports.getDocumentsForStudent = exports.createDocument = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const document_model_1 = __importDefault(require("./document.model"));
const AppError_1 = require("../../errors/AppError");
const upload_1 = require("../../utils/upload");
const resolveStoredFilePath = (fileUrl) => {
    if (!fileUrl.startsWith('/uploads/')) {
        return '';
    }
    return path_1.default.resolve(upload_1.uploadsRoot, fileUrl.replace(/^\/uploads\//, ''));
};
const createDocument = async (input) => document_model_1.default.create(input);
exports.createDocument = createDocument;
const getDocumentsForStudent = async (studentId) => document_model_1.default.find({ studentId }).sort({ uploadedAt: -1, createdAt: -1 });
exports.getDocumentsForStudent = getDocumentsForStudent;
const getDocumentById = async (documentId) => {
    const document = await document_model_1.default.findById(documentId);
    if (!document) {
        throw new AppError_1.NotFoundError('Document not found.', 'The requested document does not exist.', 'Refresh the page and try again.', 'DOCUMENT_NOT_FOUND');
    }
    return document;
};
exports.getDocumentById = getDocumentById;
const updateDocumentStatus = async (documentId, status) => {
    const document = await (0, exports.getDocumentById)(documentId);
    document.status = status;
    await document.save();
    return document;
};
exports.updateDocumentStatus = updateDocumentStatus;
const deleteDocument = async (documentId) => {
    const document = await (0, exports.getDocumentById)(documentId);
    const storedFilePath = resolveStoredFilePath(document.fileUrl);
    if (storedFilePath) {
        await promises_1.default.unlink(storedFilePath).catch(() => undefined);
    }
    await document.deleteOne();
    return document;
};
exports.deleteDocument = deleteDocument;
