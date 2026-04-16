import { apiClient } from './httpClient';
import type {
  ApplicationCourseSummary,
  WorkflowApplication,
} from '../types/application';
import type { CourseInput } from '../types/course';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AdminStatCard {
  title: string;
  value: string;
  icon: string;
  trend: string;
  color: string;
}

export interface AdminCountryMetric {
  name: string;
  applications: number;
}

export interface AdminMonthlyMetric {
  month: string;
  apps: number;
}

export interface AdminDashboardMetrics {
  adminStats: AdminStatCard[];
  countryData: AdminCountryMetric[];
  monthlyTrend: AdminMonthlyMetric[];
}

export interface AdminUserRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  sapId?: string;
  isActive?: boolean;
  createdAt?: string;
  designation?: string;
  department?: string;
  password?: string;
}

export interface CountryRecord {
  _id: string;
  name: string;
  code: string;
}

export interface UniversityRecord {
  _id: string;
  name: string;
  countryId: CountryRecord | string;
  website?: string;
  seatLimit: number;
  createdAt?: string;
  updatedAt?: string;
}

const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => {
  const response = await request;
  return response.data.data;
};

export const adminApi = {
  getStats: () => unwrap<AdminDashboardMetrics>(apiClient.get('/admin/stats')),
  getUsers: () => unwrap<AdminUserRecord[]>(apiClient.get('/admin/users')),
  createUser: (payload: Record<string, unknown>) =>
    unwrap<AdminUserRecord>(apiClient.post('/admin/users', payload)),
  getApplications: () =>
    unwrap<WorkflowApplication[]>(apiClient.get('/admin/applications')),
  getPendingApplications: () =>
    unwrap<WorkflowApplication[]>(apiClient.get('/admin/applications/pending')),
  uploadOfferLetter: (payload: { applicationId: string; offerLetterUrl: string }) =>
    unwrap<Record<string, unknown>>(apiClient.post('/admin/offer-letter', payload)),
  getCountries: () => unwrap<CountryRecord[]>(apiClient.get('/catalog/countries')),
  getUniversities: () => unwrap<UniversityRecord[]>(apiClient.get('/catalog/universities')),
  createUniversity: (payload: Record<string, unknown>) =>
    unwrap<UniversityRecord>(apiClient.post('/admin/universities', payload)),
  getCourses: () =>
    unwrap<ApplicationCourseSummary[]>(apiClient.get('/courses')),
  createCourse: (payload: CourseInput) =>
    unwrap<ApplicationCourseSummary>(apiClient.post('/courses', payload)),
  updateCourse: (courseId: string, payload: CourseInput) =>
    unwrap<ApplicationCourseSummary>(apiClient.put(`/courses/${courseId}`, payload)),
  deleteCourse: (courseId: string) =>
    unwrap<Record<string, unknown>>(apiClient.delete(`/courses/${courseId}`)),
};
