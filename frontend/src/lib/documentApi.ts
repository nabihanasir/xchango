import { apiClient } from './httpClient';
import { resolveUploadUrl } from './studentProfileApi';
import type { StudentDocument, DocumentStatus } from '../types/document';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => {
  const response = await request;
  return response.data.data;
};

export const documentApi = {
  uploadDocument: async (studentId: string, type: string, file: File) => {
    const formData = new FormData();
    formData.append('studentId', studentId);
    formData.append('type', type);
    formData.append('file', file);

    return unwrap<StudentDocument>(
      apiClient.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );
  },
  getStudentDocuments: (studentId: string) =>
    unwrap<StudentDocument[]>(apiClient.get(`/documents/student/${studentId}`)),
  deleteDocument: (documentId: string) =>
    unwrap<StudentDocument>(apiClient.delete(`/documents/${documentId}`)),
  updateDocumentStatus: (documentId: string, status: DocumentStatus) =>
    unwrap<StudentDocument>(apiClient.patch(`/documents/${documentId}/status`, { status })),
};

export { resolveUploadUrl };
