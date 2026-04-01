import axios from 'axios';
import type { ApplicationDraftPayload, ApplicationStatus, WorkflowApplication } from '../types/application';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const applicationApiClient = axios.create({
  baseURL: API_BASE,
});

applicationApiClient.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) {
    return config;
  }

  const user = JSON.parse(storedUser) as { token?: string };
  if (user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }

  return config;
});

const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => {
  const response = await request;
  return response.data.data;
};

export const resolveApplicationFileUrl = (fileUrl?: string) => {
  if (!fileUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  return `${API_ORIGIN}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
};

export const applicationApi = {
  createApplication: (studentId: string, payload: Pick<ApplicationDraftPayload, 'country' | 'university' | 'program'>) =>
    unwrap<WorkflowApplication>(applicationApiClient.post('/applications', { studentId, ...payload })),
  updateApplicationStep: (applicationId: string, payload: Partial<ApplicationDraftPayload>) =>
    unwrap<WorkflowApplication>(applicationApiClient.patch(`/applications/${applicationId}`, payload)),
  getApplication: (applicationId: string) =>
    unwrap<WorkflowApplication>(applicationApiClient.get(`/applications/${applicationId}`)),
  getStudentApplications: (studentId: string) =>
    unwrap<WorkflowApplication[]>(applicationApiClient.get(`/applications/student/${studentId}`)),
  getAdvisorApplications: () =>
    unwrap<WorkflowApplication[]>(applicationApiClient.get('/applications/advisor')),
  submitApplication: (applicationId: string) =>
    unwrap<WorkflowApplication>(applicationApiClient.post(`/applications/${applicationId}/submit`)),
  updateStatus: (applicationId: string, status: ApplicationStatus) =>
    unwrap<WorkflowApplication>(applicationApiClient.patch(`/applications/${applicationId}/status`, { status })),
  assignAdvisor: (applicationId: string, advisorId: string) =>
    unwrap<WorkflowApplication>(applicationApiClient.patch(`/applications/${applicationId}/assign-advisor`, { advisorId })),
  scheduleInterview: (
    applicationId: string,
    payload: { date: string; location: string; stakeholders: string[] }
  ) => unwrap<WorkflowApplication>(applicationApiClient.patch(`/applications/${applicationId}/schedule-interview`, payload)),
  uploadDocuments: async (applicationId: string, type: string, files: File[]) => {
    const formData = new FormData();
    formData.append('type', type);
    files.forEach((file) => formData.append('files', file));

    return unwrap<WorkflowApplication>(
      applicationApiClient.post(`/applications/${applicationId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );
  },
  selectCourses: (applicationId: string, courseNames: string[]) =>
    unwrap<WorkflowApplication>(applicationApiClient.post(`/applications/${applicationId}/courses`, { courseNames })),
};
