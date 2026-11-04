import { apiClient } from './httpClient';
import type {
  ApplicationCourseSummary,
  WorkflowApplication,
} from '../types/application';
import type { CourseInput, CourseInstructorInput } from '../types/course';
import type { CatalogCountry, CatalogUniversity } from '../types/university';

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
  offboardedAt?: string;
  createdAt?: string;
  designation?: string;
  department?: string;
  countries?: string[];
  password?: string;
}

export type CountryRecord = CatalogCountry;

/** A university as the admin sees it: drafts included, plus what is still missing before it can be published. */
export interface UniversityRecord extends CatalogUniversity {
  createdAt?: string;
  updatedAt?: string;
  /** Advisors responsible for this university's country (shared by every university in that country). */
  advisorIds: string[];
  hostCourseCount: number;
  publishIssues: string[];
}

export interface UniversitySavePayload extends Partial<Omit<CatalogUniversity, 'countryId'>> {
  countryId?: string;
  country?: { name: string; code: string; flag?: string; image?: string };
  countryImage?: string;
  advisorIds?: string[];
}

export interface UniversitySaveResult {
  university: UniversityRecord;
  assignedApplications: number;
}

export interface ScrapeUniversityResult {
  fields: Record<string, unknown>;
  confidence: Record<string, 'found' | 'review' | 'empty'>;
  sources: string[];
  warnings: string[];
}

export interface HostCoursePayload {
  universityId: string;
  code: string;
  title: string;
  creditHours: number;
  description?: string;
  instructorName?: string;
  instructorEmail?: string;
}

export type AiProvider = 'openrouter' | 'gemini' | 'groq' | 'openai-compatible';

export interface AiModelConfigRecord {
  _id: string;
  provider: AiProvider;
  baseUrl: string;
  model: string;
  isEnabled: boolean;
  apiKeySet: boolean;
  apiKeyPreview: string | null;
  updatedAt?: string;
}

export interface AiModelConfigInput {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  isEnabled: boolean;
  apiKey?: string;
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
  setAdvisorCountries: (userId: string, countries: string[]) =>
    unwrap<{ _id: string; countries: string[] }>(apiClient.put(`/admin/users/${userId}/countries`, { countries })),
  getApplications: () =>
    unwrap<WorkflowApplication[]>(apiClient.get('/admin/applications')),
  getPendingApplications: () =>
    unwrap<WorkflowApplication[]>(apiClient.get('/admin/applications/pending')),
  setSemesterEndDate: (applicationId: string, semesterEndDate: string | null) =>
    unwrap<WorkflowApplication>(apiClient.put(`/admin/applications/${applicationId}/semester-end`, { semesterEndDate })),
  reactivateStudent: (userId: string) =>
    unwrap<AdminUserRecord>(apiClient.post(`/admin/users/${userId}/reactivate`)),
  uploadOfferLetter: (payload: { applicationId: string; offerLetterUrl: string }) =>
    unwrap<Record<string, unknown>>(apiClient.post('/admin/offer-letter', payload)),
  getCountries: () => unwrap<CountryRecord[]>(apiClient.get('/catalog/countries')),
  getUniversities: () => unwrap<UniversityRecord[]>(apiClient.get('/admin/universities')),
  createUniversity: (payload: UniversitySavePayload) =>
    unwrap<UniversitySaveResult>(apiClient.post('/admin/universities', payload)),
  updateUniversity: (universityId: string, payload: UniversitySavePayload) =>
    unwrap<UniversitySaveResult>(apiClient.put(`/admin/universities/${universityId}`, payload)),
  // Reading several pages with a headless browser and an LLM can take a minute.
  scrapeUniversity: (url: string) =>
    unwrap<ScrapeUniversityResult>(apiClient.post('/admin/universities/scrape', { url }, { timeout: 120000 })),
  createHostCourse: (payload: HostCoursePayload) =>
    unwrap<ApplicationCourseSummary>(apiClient.post('/admin/host-courses', payload)),
  getCourses: () =>
    unwrap<ApplicationCourseSummary[]>(apiClient.get('/courses')),
  createCourse: (payload: CourseInput) =>
    unwrap<ApplicationCourseSummary>(apiClient.post('/courses', payload)),
  updateCourse: (courseId: string, payload: CourseInput) =>
    unwrap<ApplicationCourseSummary>(apiClient.put(`/courses/${courseId}`, payload)),
  deleteCourse: (courseId: string) =>
    unwrap<Record<string, unknown>>(apiClient.delete(`/courses/${courseId}`)),
  getHostCourses: () =>
    unwrap<ApplicationCourseSummary[]>(apiClient.get('/courses/host')),
  updateCourseInstructor: (courseId: string, payload: CourseInstructorInput) =>
    unwrap<ApplicationCourseSummary>(apiClient.patch(`/courses/${courseId}/instructor`, payload)),
  getAiModelConfig: () =>
    unwrap<AiModelConfigRecord | null>(apiClient.get('/admin/ai-model-config')),
  updateAiModelConfig: (payload: AiModelConfigInput) =>
    unwrap<AiModelConfigRecord>(apiClient.put('/admin/ai-model-config', payload)),
};
