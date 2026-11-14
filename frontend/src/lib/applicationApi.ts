import { apiClient } from './httpClient';
import type {
  ApplicationCourseSummary,
  ArrivalResult,
  ApplicationDraftPayload,
  ApplicationStatus,
  InterviewSlotsResponse,
  SelectedCourseStatus,
  WorkflowApplication,
} from '../types/application';

import type { JourneyInput } from '../utils/studentJourney';

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

export const resolveApplicationFileUrl = (fileUrl?: string) => {
  if (!fileUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  const url = `${API_ORIGIN}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
  // Uploaded files are private; plain links cannot send headers, so the login token goes in the query string.
  try {
    const token = JSON.parse(localStorage.getItem('user') || 'null')?.token;
    return token ? `${url}?token=${encodeURIComponent(token)}` : url;
  } catch {
    return url;
  }
};

export const applicationApi = {
  createApplication: (studentId: string, payload: Pick<ApplicationDraftPayload, 'country' | 'university' | 'program'>) =>
    unwrap<WorkflowApplication>(apiClient.post('/applications', { studentId, ...payload })),
  updateApplicationStep: (applicationId: string, payload: Partial<ApplicationDraftPayload>) =>
    unwrap<WorkflowApplication>(apiClient.patch(`/applications/${applicationId}`, payload)),
  getApplication: (applicationId: string) =>
    unwrap<WorkflowApplication>(apiClient.get(`/applications/${applicationId}`)),
  getApplicationJourney: (applicationId: string) =>
    unwrap<Pick<JourneyInput, 'requests' | 'visa' | 'results'>>(apiClient.get(`/applications/${applicationId}/journey`)),
  getStudentApplications: (studentId: string) =>
    unwrap<WorkflowApplication[]>(apiClient.get(`/applications/student/${studentId}`)),
  getAdvisorApplications: () =>
    unwrap<WorkflowApplication[]>(apiClient.get('/applications/advisor')),
  submitApplication: (applicationId: string) =>
    unwrap<WorkflowApplication>(apiClient.post(`/applications/${applicationId}/submit`)),
  updateStatus: (applicationId: string, status: ApplicationStatus) =>
    unwrap<WorkflowApplication>(apiClient.patch(`/applications/${applicationId}/status`, { status })),
  assignAdvisor: (applicationId: string, advisorId: string) =>
    unwrap<WorkflowApplication>(apiClient.patch(`/applications/${applicationId}/assign-advisor`, { advisorId })),
  scheduleInterview: (
    applicationId: string,
    payload: { date: string; location: string; stakeholders: string[] }
  ) => unwrap<WorkflowApplication>(apiClient.patch(`/applications/${applicationId}/schedule-interview`, payload)),
  getInterviewSlots: (applicationId: string) =>
    unwrap<InterviewSlotsResponse>(apiClient.get(`/applications/${applicationId}/interview-slots`)),
  requestInterview: (applicationId: string, payload: { start: string; durationMinutes: 30 | 60 }) =>
    unwrap<WorkflowApplication>(apiClient.post(`/applications/${applicationId}/interview-request`, payload)),
  cancelInterviewRequest: (applicationId: string, payload: { reason?: string; details?: string } = {}) =>
    unwrap<WorkflowApplication>(apiClient.post(`/applications/${applicationId}/interview-request/cancel`, payload)),
  respondToInterviewRequest: (
    applicationId: string,
    payload: { accept: boolean; note?: string; location?: string }
  ) => unwrap<WorkflowApplication>(apiClient.post(`/applications/${applicationId}/interview-request/respond`, payload)),
  getAdvisorAvailability: () =>
    unwrap<InterviewSlotsResponse>(apiClient.get('/applications/advisor/availability')),
  setAdvisorAvailability: (slots: string[], unavailable: boolean) =>
    unwrap<InterviewSlotsResponse>(apiClient.put('/applications/advisor/availability', { slots, unavailable })),
  completeInterview: (applicationId: string) =>
    unwrap<WorkflowApplication>(apiClient.patch(`/applications/${applicationId}/complete-interview`)),
  recordInterviewDecision: (applicationId: string, payload: { recommended: boolean; notes?: string }) =>
    unwrap<WorkflowApplication>(apiClient.patch(`/applications/${applicationId}/interview-decision`, payload)),
  uploadDocuments: async (applicationId: string, type: string, files: File[]) => {
    const formData = new FormData();
    formData.append('type', type);
    files.forEach((file) => formData.append('files', file));

    return unwrap<WorkflowApplication>(
      apiClient.post(`/applications/${applicationId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );
  },
  getAvailableCourses: (applicationId: string) =>
    unwrap<ApplicationCourseSummary[]>(apiClient.get(`/applications/${applicationId}/available-courses`)),
  selectCourses: (applicationId: string, courseIds: string[]) =>
    unwrap<WorkflowApplication>(apiClient.post(`/applications/${applicationId}/courses`, { courseIds })),
  updateCourseDecision: (
    applicationId: string,
    payload: { courseId: string; status: Exclude<SelectedCourseStatus, 'pending'>; advisorComment?: string }
  ) => unwrap<WorkflowApplication>(apiClient.put(`/applications/${applicationId}/course-decision`, payload)),
  reportArrival: (applicationId: string) =>
    unwrap<{ reportedAt: string }>(apiClient.post(`/applications/${applicationId}/arrival-report`)),
  recordArrival: (applicationId: string, payload: { arrivedAt: string; onlineHomeCourseIds: string[] }) =>
    unwrap<ArrivalResult>(apiClient.post(`/applications/${applicationId}/arrival`, payload)),
};
