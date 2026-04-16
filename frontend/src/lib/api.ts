import type { AdvisorDecisionPayload, CourseRequest, CourseSummary } from '../types/equivalency';
import { parseApiError } from './errorUtils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const apiRequest = async <T>(path: string, token: string, init?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });

    const payload = (await response.json()) as ApiEnvelope<T> & { error?: unknown };

    if (!response.ok || !payload.success) {
      throw parseApiError(payload);
    }

    return payload.data;
  } catch (error) {
    throw parseApiError(error);
  }
};

export const equivalencyApi = {
  getHostCourses: (token: string) =>
    apiRequest<CourseSummary[]>('/equivalency/host-courses', token),
  getHomeCourses: (token: string) =>
    apiRequest<CourseSummary[]>('/courses', token),
  getStudentRequests: (token: string) =>
    apiRequest<CourseRequest[]>('/equivalency/student/requests', token),
  createStudentRequest: (token: string, hostCourseIds: string[]) =>
    apiRequest<CourseRequest>('/equivalency/student/requests', token, {
      method: 'POST',
      body: JSON.stringify({ hostCourseIds }),
    }),
  getAdvisorRequests: (token: string) =>
    apiRequest<CourseRequest[]>('/equivalency/advisor/requests', token),
  getAdvisorRequestById: (token: string, requestId: string) =>
    apiRequest<CourseRequest>(`/equivalency/advisor/requests/${requestId}`, token),
  updateHomeCourseSelection: (token: string, requestId: string, itemId: string, homeCourseId: string) =>
    apiRequest<CourseRequest>(`/equivalency/advisor/requests/${requestId}/items/${itemId}/home-course`, token, {
      method: 'PUT',
      body: JSON.stringify({ homeCourseId }),
    }),
  runCourseMatch: (token: string, requestId: string, itemId: string) =>
    apiRequest<CourseRequest>(`/equivalency/advisor/requests/${requestId}/items/${itemId}/run-match`, token, {
      method: 'POST',
    }),
  submitAdvisorDecision: (token: string, requestId: string, payload: AdvisorDecisionPayload) =>
    apiRequest<CourseRequest>(`/equivalency/advisor/requests/${requestId}/decision`, token, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
