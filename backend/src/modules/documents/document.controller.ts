import { Response } from 'express';
import { ForbiddenError, ValidationError } from '../../errors/AppError';
import { UserRole } from '../../models/User';
import * as applicationService from '../../services/applicationService';
import { sendResponse } from '../../utils/response';
import { toPublicFileUrl } from '../../utils/upload';
import {
  createDocument,
  deleteDocument,
  getDocumentById,
  getDocumentsForStudent,
  updateDocumentStatus,
} from './document.service';
import type { DocumentStatus } from './document.model';

const isDocumentOwner = (req: any, studentId: string) =>
  req.user.role === UserRole.STUDENT && req.user._id.toString() !== studentId;

const assertViewAccess = async (req: any, studentId: string) => {
  if (req.user.role === UserRole.ADMIN) {
    return;
  }

  if (req.user.role === UserRole.STUDENT) {
    if (isDocumentOwner(req, studentId)) {
      throw new ForbiddenError(
        'You are not authorized to access these documents.',
        'The requested document records belong to another student.',
        'Use the correct student account to manage these documents.',
        'DOCUMENT_ACCESS_DENIED'
      );
    }

    return;
  }

  if (req.user.role === UserRole.ADVISOR) {
    const canAccess = await applicationService.advisorCanAccessStudent(
      req.user._id.toString(),
      studentId
    );

    if (!canAccess) {
      throw new ForbiddenError(
        'You are not authorized to access these documents.',
        'The requested student is not assigned to the current advisor.',
        'Open a student assigned to you or contact an administrator.',
        'DOCUMENT_ACCESS_DENIED'
      );
    }

    return;
  }

  throw new ForbiddenError(
    'You are not authorized to access these documents.',
    'The current user role cannot access document records.',
    'Use a student, advisor, or admin account with valid access.',
    'DOCUMENT_ACCESS_DENIED'
  );
};

const assertWriteAccess = async (req: any, studentId: string) => {
  if (req.user.role === UserRole.ADMIN) {
    return;
  }

  if (req.user.role === UserRole.STUDENT && !isDocumentOwner(req, studentId)) {
    throw new ForbiddenError(
      'You are not authorized to access these documents.',
      'The requested document records belong to another student.',
      'Use the correct student account to manage these documents.',
      'DOCUMENT_ACCESS_DENIED'
    );
  }

  if (req.user.role !== UserRole.STUDENT) {
    throw new ForbiddenError(
      'You are not authorized to upload documents.',
      'Only students and administrators can upload student documents.',
      'Use a student or admin account to upload a document.',
      'DOCUMENT_UPLOAD_DENIED'
    );
  }
};

const assertStatusAccess = async (req: any, studentId: string) => {
  if (req.user.role === UserRole.ADMIN) {
    return;
  }

  if (req.user.role === UserRole.ADVISOR) {
    const canAccess = await applicationService.advisorCanAccessStudent(
      req.user._id.toString(),
      studentId
    );

    if (!canAccess) {
      throw new ForbiddenError(
        'You are not authorized to review these documents.',
        'The requested student is not assigned to the current advisor.',
        'Open a student assigned to you or contact an administrator.',
        'DOCUMENT_REVIEW_DENIED'
      );
    }

    return;
  }

  throw new ForbiddenError(
    'You are not authorized to review these documents.',
    'Only advisors and administrators can approve or reject documents.',
    'Use an advisor or admin account to review documents.',
    'DOCUMENT_REVIEW_DENIED'
  );
};

export const uploadDocument = async (req: any, res: Response) => {
  if (!req.file) {
    throw new ValidationError(
      'Please upload a document file.',
      'No document file was included in the request.',
      'Attach a file and try again.',
      'DOCUMENT_FILE_REQUIRED'
    );
  }

  const requestedStudentId = String(req.body.studentId || '').trim();
  const studentId =
    req.user.role === UserRole.ADMIN ? requestedStudentId : requestedStudentId || req.user._id.toString();

  if (req.user.role === UserRole.ADMIN && !studentId) {
    throw new ValidationError(
      'Student ID is required.',
      'Administrator uploads must be associated with a student account.',
      'Provide the studentId and try again.',
      'STUDENT_ID_REQUIRED'
    );
  }

  await assertWriteAccess(req, studentId);

  const type = String(req.body.type || req.body.documentType || '').trim();
  if (!type) {
    throw new ValidationError(
      'Document type is required.',
      'The request did not specify the document type.',
      'Provide the document type and try again.',
      'DOCUMENT_TYPE_REQUIRED'
    );
  }

  const document = await createDocument({
    studentId,
    type,
    fileUrl: toPublicFileUrl(req.file.path),
    fileName: req.file.originalname,
    status: 'pending',
  });

  sendResponse(res, 201, 'Document uploaded successfully', document);
};

export const getStudentDocuments = async (req: any, res: Response) => {
  const studentId = req.params.studentId;
  await assertViewAccess(req, studentId);

  const documents = await getDocumentsForStudent(studentId);
  sendResponse(res, 200, 'Documents fetched successfully', documents);
};

export const deleteDocumentById = async (req: any, res: Response) => {
  const document = await getDocumentById(req.params.id);

  if (req.user.role === UserRole.ADMIN) {
    const deletedDocument = await deleteDocument(req.params.id);
    sendResponse(res, 200, 'Document deleted successfully', deletedDocument);
    return;
  }

  if (req.user.role === UserRole.STUDENT && document.studentId.toString() !== req.user._id.toString()) {
    throw new ForbiddenError(
      'You are not authorized to delete this document.',
      'The requested document belongs to another student.',
      'Use the correct student account to delete documents.',
      'DOCUMENT_DELETE_DENIED'
    );
  }

  if (req.user.role === UserRole.ADVISOR) {
    throw new ForbiddenError(
      'You are not authorized to delete this document.',
      'Advisors can review documents but cannot delete them.',
      'Use an admin account if a document needs to be removed.',
      'DOCUMENT_DELETE_DENIED'
    );
  }

  if (req.user.role !== UserRole.STUDENT) {
    throw new ForbiddenError(
      'You are not authorized to delete this document.',
      'The current user role cannot delete student documents.',
      'Use a student or admin account to remove a document.',
      'DOCUMENT_DELETE_DENIED'
    );
  }

  const deletedDocument = await deleteDocument(req.params.id);
  sendResponse(res, 200, 'Document deleted successfully', deletedDocument);
};

export const updateDocumentReviewStatus = async (req: any, res: Response) => {
  const document = await getDocumentById(req.params.id);
  await assertStatusAccess(req, document.studentId.toString());

  const status = String(req.body.status || '').toLowerCase() as DocumentStatus;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    throw new ValidationError(
      'Invalid document status.',
      'The provided status is not supported.',
      'Use pending, approved, or rejected.',
      'DOCUMENT_STATUS_INVALID'
    );
  }

  const updatedDocument = await updateDocumentStatus(req.params.id, status);
  sendResponse(res, 200, 'Document status updated successfully', updatedDocument);
};
