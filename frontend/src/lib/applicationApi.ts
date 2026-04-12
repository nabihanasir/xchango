import axios from 'axios';
import type {
  ApplicationCourseSummary,
  ApplicationDraftPayload,
  ApplicationStatus,
  SelectedCourseStatus,
  WorkflowApplication,
  WorkflowApplicationAIRecommendation,
} from '../types/application';

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
  getAvailableCourses: (applicationId: string) =>
    unwrap<ApplicationCourseSummary[]>(applicationApiClient.get(`/applications/${applicationId}/available-courses`)),
  selectCourses: (applicationId: string, courseIds: string[]) =>
    unwrap<WorkflowApplication>(applicationApiClient.post(`/applications/${applicationId}/courses`, { courseIds })),
  generateAiRecommendations: (applicationId: string) =>
    unwrap<WorkflowApplication>(applicationApiClient.post(`/applications/${applicationId}/ai-recommendations`)),
  getAiRecommendations: (applicationId: string) =>
    unwrap<WorkflowApplicationAIRecommendation[]>(
      applicationApiClient.get(`/applications/${applicationId}/ai-recommendations`)
    ),
  updateCourseDecision: (
    applicationId: string,
    payload: { courseId: string; status: Exclude<SelectedCourseStatus, 'pending'>; advisorComment?: string }
  ) => unwrap<WorkflowApplication>(applicationApiClient.put(`/applications/${applicationId}/course-decision`, payload)),
};
