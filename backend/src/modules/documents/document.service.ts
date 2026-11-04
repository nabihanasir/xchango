import StudentDocument, { DocumentStatus, IStudentDocument } from './document.model';
import { NotFoundError } from '../../errors/AppError';
import { deleteStoredFile } from '../../utils/storedFiles';

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
  await deleteStoredFile(document.fileUrl);
  await document.deleteOne();
  return document as IStudentDocument;
};
