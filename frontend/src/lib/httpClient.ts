import axios, { AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { parseApiError } from './errorUtils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

type RetriableConfig = InternalAxiosRequestConfig & { _retryAttempted?: boolean };

const attachAuth = (config: InternalAxiosRequestConfig) => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) {
    return config;
  }

  const user = JSON.parse(storedUser) as { token?: string };
  const headers = config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers);

  if (user.token) {
    headers.set('Authorization', `Bearer ${user.token}`);
  }

  config.headers = headers;
  return config;
};

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => attachAuth(config));

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetriableConfig | undefined;
    const shouldRetry = !error.response && config && !config._retryAttempted;

    if (shouldRetry) {
      config._retryAttempted = true;
      return apiClient(config);
    }

    return Promise.reject(parseApiError(error));
  },
);
