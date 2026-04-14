import { Response } from 'express';
import { ForbiddenError, ValidationError } from '../errors/AppError';
import { UserRole } from '../models/User';
import * as studentService from '../services/studentService';
import { sendResponse } from '../utils/response';
import { toPublicFileUrl } from '../utils/upload';

const assertStudentAccess = (req: any, studentId: string) => {
  if (req.user.role === UserRole.STUDENT && req.user._id.toString() !== studentId) {
    throw new ForbiddenError(
      'You are not authorized to access these documents.',
      'The requested document records belong to another student.',
      'Use the correct student account to manage these documents.',
      'DOCUMENT_ACCESS_DENIED'
    );
  }
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

  const studentId = req.body.studentId || req.user._id.toString();
  assertStudentAccess(req, studentId);

  const type = req.body.type || req.body.documentType;
  if (!type) {
    throw new ValidationError(
      'Document type is required.',
      'The request did not specify the document type.',
      'Provide the document type and try again.',
      'DOCUMENT_TYPE_REQUIRED'
    );
  }

  const documents = await studentService.addDocument(studentId, {
    type,
    status: req.body.status || 'pending',
    fileUrl: toPublicFileUrl(req.file.path),
  });

  sendResponse(res, 201, 'Document uploaded successfully', documents);
};

export const getStudentDocuments = async (req: any, res: Response) => {
  const studentId = req.params.studentId;
  assertStudentAccess(req, studentId);
  const documents = await studentService.getDocuments(studentId);
  sendResponse(res, 200, 'Documents fetched successfully', documents);
};

export const deleteDocument = async (req: any, res: Response) => {
  const documents = await studentService.removeDocument(req.user._id.toString(), req.params.docId);
  sendResponse(res, 200, 'Document deleted successfully', documents);
};
