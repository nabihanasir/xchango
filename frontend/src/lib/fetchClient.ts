import type { ApiErrorEnvelope } from '../types/error';
import { parseApiError } from './errorUtils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) {
    return {};
  }

  const user = JSON.parse(storedUser) as { token?: string };
  return user.token ? { Authorization: `Bearer ${user.token}` } : {};
};

export const apiFetch = async <T>(path: string, init?: RequestInit, retry = true): Promise<T> => {
  try {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');
    Object.entries(getAuthHeaders()).forEach(([key, value]) => headers.set(key, value));

    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });

    const payload = (await response.json()) as { success?: boolean; data?: T } & Partial<ApiErrorEnvelope>;

    if (!response.ok || payload.success === false) {
      throw parseApiError(payload);
    }

    return payload.data as T;
  } catch (error) {
    if (retry && error instanceof TypeError) {
      return apiFetch<T>(path, init, false);
    }

    throw parseApiError(error);
  }
};
