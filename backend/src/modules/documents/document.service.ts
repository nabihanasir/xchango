import fs from 'fs/promises';
import path from 'path';
import StudentDocument, { DocumentStatus, IStudentDocument } from './document.model';
import { NotFoundError } from '../../errors/AppError';
import { uploadsRoot } from '../../utils/upload';

const resolveStoredFilePath = (fileUrl: string) => {
  if (!fileUrl.startsWith('/uploads/')) {
    return '';
  }

  return path.resolve(uploadsRoot, fileUrl.replace(/^\/uploads\//, ''));
};

export const createDocument = async (input: {
  studentId: string;
  type: string;
  fileUrl: string;
  fileName: string;
  status?: DocumentStatus;
}) => StudentDocument.create(input);

export const getDocumentsForStudent = async (studentId: string) =>
  StudentDocument.find({ studentId }).sort({ uploadedAt: -1, createdAt: -1 });

export const getDocumentById = async (documentId: string) => {
  const document = await StudentDocument.findById(documentId);
  if (!document) {
    throw new NotFoundError(
      'Document not found.',
      'The requested document does not exist.',
      'Refresh the page and try again.',
      'DOCUMENT_NOT_FOUND'
    );
  }

  return document;
};

export const updateDocumentStatus = async (documentId: string, status: DocumentStatus) => {
  const document = await getDocumentById(documentId);
  document.status = status;
  await document.save();
  return document;
};

export const deleteDocument = async (documentId: string) => {
  const document = await getDocumentById(documentId);
  const storedFilePath = resolveStoredFilePath(document.fileUrl);

  if (storedFilePath) {
    await fs.unlink(storedFilePath).catch(() => undefined);
  }

  await document.deleteOne();
  return document as IStudentDocument;
};
