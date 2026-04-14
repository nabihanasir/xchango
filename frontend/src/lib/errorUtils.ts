import axios from 'axios';
import type { ApiErrorEnvelope } from '../types/error';
import { AppApiError } from '../types/error';

const fallbackError = (overrides?: Partial<ApiErrorEnvelope['error']>) =>
  new AppApiError({
    code: overrides?.code || 'UNEXPECTED_ERROR',
    message: overrides?.message || 'Request failed',
    reason: overrides?.reason || 'The application could not complete the request.',
    solution: overrides?.solution || 'Please try again. If the issue continues, contact support.',
    status: overrides?.status || 500,
    timestamp: overrides?.timestamp || new Date().toISOString(),
    path: overrides?.path || '',
    requestId: overrides?.requestId,
  });

export const parseApiError = (input: unknown): AppApiError => {
  if (input instanceof AppApiError) {
    return input;
  }

  if (axios.isAxiosError(input)) {
    const payload = input.response?.data as Partial<ApiErrorEnvelope> | undefined;
    if (payload?.error) {
      return new AppApiError(payload.error);
    }

    if (!input.response) {
      return fallbackError({
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        reason: 'The server could not be reached or the request timed out.',
        solution: 'Check your internet connection and try again.',
        status: 503,
      });
    }
  }

  if (input instanceof Response) {
    return fallbackError({
      status: input.status,
      path: input.url,
    });
  }

  if (typeof input === 'object' && input !== null && 'error' in input) {
    const payload = input as ApiErrorEnvelope;
    if (payload.error) {
      return new AppApiError(payload.error);
    }
  }

  if (input instanceof Error) {
    return fallbackError({
      message: input.message || 'Request failed',
      reason: input.message || 'The application could not complete the request.',
    });
  }

  return fallbackError();
};

export const formatErrorSummary = (input: unknown) => {
  const error = parseApiError(input);

  return {
    title: error.message,
    reason: error.reason,
    solution: error.solution,
    code: error.code,
    status: error.status,
    requestId: error.requestId,
  };
};
