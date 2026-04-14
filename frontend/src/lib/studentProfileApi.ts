import { apiClient } from './httpClient';
import type {
  StudentDocument,
  StudentProfile,
  StudentTranscript,
} from '../types/studentProfile';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => {
  const response = await request;
  return response.data.data;
};

export const resolveUploadUrl = (fileUrl?: string) => {
  if (!fileUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  return `${API_ORIGIN}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
};

export const studentProfileApi = {
  getStudentProfile: (studentId: string) =>
    unwrap<StudentProfile>(apiClient.get(`/students/${studentId}`)),
  updateStudentProfile: (
    studentId: string,
    payload: Pick<StudentProfile, 'basicInfo' | 'preferences'>
  ) => unwrap<StudentProfile>(apiClient.put(`/students/${studentId}`, payload)),
  uploadTranscript: async (studentId: string, file: File) => {
    const formData = new FormData();
    formData.append('studentId', studentId);
    formData.append('file', file);

    return unwrap<StudentTranscript>(
      apiClient.post('/transcript/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );
  },
  getTranscript: (studentId: string) =>
    unwrap<StudentTranscript>(apiClient.get(`/transcript/${studentId}`)),
  uploadDocument: async (studentId: string, type: string, file: File) => {
    const formData = new FormData();
    formData.append('studentId', studentId);
    formData.append('type', type);
    formData.append('file', file);

    return unwrap<StudentDocument[]>(
      apiClient.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );
  },
  getDocuments: (studentId: string) =>
    unwrap<StudentDocument[]>(apiClient.get(`/documents/${studentId}`)),
  deleteDocument: (documentId: string) =>
    unwrap<StudentDocument[]>(apiClient.delete(`/documents/${documentId}`)),
};
