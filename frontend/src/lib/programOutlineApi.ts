import { apiClient } from './httpClient';
import type { OutlineSemester, ProgramOutline } from '../types/equivalency';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => (await request).data.data;

export const programOutlineApi = {
  getMine: () => unwrap<ProgramOutline | null>(apiClient.get('/program-outline/me')),
  getForStudent: (studentId: string) =>
    unwrap<ProgramOutline | null>(apiClient.get(`/program-outline/student/${studentId}`)),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return unwrap<ProgramOutline>(
      apiClient.post('/program-outline/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Reading the outline uses an AI model (and provider fallbacks), which can outlast the default timeout.
        timeout: 120000,
      })
    );
  },
  update: (studentId: string, semesters: OutlineSemester[]) =>
    unwrap<ProgramOutline>(apiClient.put(`/program-outline/student/${studentId}`, { semesters })),
};
