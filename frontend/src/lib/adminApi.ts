import axios from 'axios';
import type {
  ApplicationCourseSummary,
  WorkflowApplication,
} from '../types/application';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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

const adminApiClient = axios.create({
  baseURL: API_BASE,
});

adminApiClient.interceptors.request.use((config) => {
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

export const adminApi = {
  getStats: () => unwrap<AdminDashboardMetrics>(adminApiClient.get('/admin/stats')),
  getUsers: () => unwrap<AdminUserRecord[]>(adminApiClient.get('/admin/users')),
  createUser: (payload: Record<string, unknown>) =>
    unwrap<AdminUserRecord>(adminApiClient.post('/admin/users', payload)),
  getApplications: () =>
    unwrap<WorkflowApplication[]>(adminApiClient.get('/admin/applications')),
  uploadOfferLetter: (payload: { applicationId: string; offerLetterUrl: string }) =>
    unwrap<Record<string, unknown>>(adminApiClient.post('/admin/offer-letter', payload)),
  getCountries: () => unwrap<CountryRecord[]>(adminApiClient.get('/catalog/countries')),
  getUniversities: () => unwrap<UniversityRecord[]>(adminApiClient.get('/catalog/universities')),
  createUniversity: (payload: Record<string, unknown>) =>
    unwrap<UniversityRecord>(adminApiClient.post('/admin/universities', payload)),
  getCourses: (params?: { universityId?: string; type?: string }) =>
    unwrap<ApplicationCourseSummary[]>(adminApiClient.get('/catalog/courses', { params })),
  createCourse: (payload: Record<string, unknown>) =>
    unwrap<ApplicationCourseSummary>(adminApiClient.post('/admin/courses', payload)),
};
