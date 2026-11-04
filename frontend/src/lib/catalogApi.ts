import { apiClient } from './httpClient';
import type { CatalogCountry, CatalogUniversity } from '../types/university';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => (await request).data.data;

/**
 * Countries and universities are maintained by admins and served by the API. Students and advisors only receive
 * countries with at least one published university; admins receive everything, including drafts.
 */
export const catalogApi = {
  getCountries: () => unwrap<CatalogCountry[]>(apiClient.get('/catalog/countries')),
  getUniversities: () => unwrap<CatalogUniversity[]>(apiClient.get('/catalog/universities')),
  getUniversityBySlug: (slug: string) =>
    unwrap<CatalogUniversity>(apiClient.get(`/catalog/universities/${encodeURIComponent(slug)}`)),
};
