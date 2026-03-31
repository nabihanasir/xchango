import { Response } from 'express';
import { UserRole } from '../models/User';
import * as studentService from '../services/studentService';
import { sendResponse } from '../utils/response';
import { toPublicFileUrl } from '../utils/upload';

const assertStudentAccess = (req: any, studentId: string) => {
  if (req.user.role === UserRole.STUDENT && req.user._id.toString() !== studentId) {
    throw new Error('You are not authorized to access these documents.');
  }
};

export const uploadDocument = async (req: any, res: Response) => {
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
