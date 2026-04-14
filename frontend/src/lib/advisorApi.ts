import axios from 'axios';
import type { WorkflowApplication } from '../types/application';

// Reuse similar structure from admin/application APIs
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AdvisorProfileData {
  _id: string;
  designation: string;
  department: string;
  experience?: number;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  assignedStudents?: string[];
}

const advisorApiClient = axios.create({
  baseURL: API_BASE,
});

advisorApiClient.interceptors.request.use((config) => {
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

export const advisorApi = {
  getProfile: () => unwrap<AdvisorProfileData>(advisorApiClient.get('/advisors/profile')),
  getAssignedApplications: () =>
    unwrap<WorkflowApplication[]>(advisorApiClient.get('/advisors/applications')),
  updateApplicationStatus: (applicationId: string, status: string) =>
    unwrap<WorkflowApplication>(advisorApiClient.put(`/advisors/applications/${applicationId}`, { status })),
};
