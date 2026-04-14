import { apiClient } from './httpClient';
import type { WorkflowApplication } from '../types/application';
import type { StudentProfile } from '../types/studentProfile';

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

const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => {
  const response = await request;
  return response.data.data;
};

export const advisorApi = {
  getProfile: () => unwrap<AdvisorProfileData>(apiClient.get('/advisors/profile')),
  getAssignedApplications: () =>
    unwrap<WorkflowApplication[]>(apiClient.get('/advisors/applications')),
  getStudents: () => unwrap<StudentProfile[]>(apiClient.get('/advisors/students')),
  updateApplicationStatus: (applicationId: string, status: string) =>
    unwrap<WorkflowApplication>(apiClient.put(`/advisors/applications/${applicationId}`, { status })),
};
