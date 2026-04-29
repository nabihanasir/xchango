import { AppApiError } from '../types/error';
import { formatErrorSummary, parseApiError } from './errorUtils';

describe('parseApiError', () => {
  it('returns AppApiError instances unchanged', () => {
    const appError = new AppApiError({
      code: 'KNOWN_ERROR',
      message: 'Known failure',
      reason: 'A known issue happened.',
      solution: 'Try a different request.',
      status: 400,
      timestamp: '2026-04-29T00:00:00.000Z',
      path: '/api/test',
      requestId: 'req-1',
    });

    expect(parseApiError(appError)).toBe(appError);
  });

  it('parses axios-style API payloads', () => {
    const error = parseApiError({
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Please log in',
            reason: 'No valid session was found.',
            solution: 'Sign in and retry.',
            status: 401,
            timestamp: '2026-04-29T00:00:00.000Z',
            path: '/api/auth',
            requestId: 'req-77',
          },
        },
      },
    });

    expect(error).toMatchObject({
      code: 'AUTH_REQUIRED',
      message: 'Please log in',
      status: 401,
      requestId: 'req-77',
    });
  });

  it('maps axios network failures to a network error', () => {
    const error = parseApiError({
      isAxiosError: true,
      response: undefined,
      message: 'Network Error',
    });

    expect(error).toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      status: 503,
    });
  });

  it('creates a fallback error for fetch responses', () => {
    const error = parseApiError(new Response(null, { status: 404 }));

    expect(error.status).toBe(404);
    expect(error.code).toBe('UNEXPECTED_ERROR');
  });
});

describe('formatErrorSummary', () => {
  it('returns the display fields needed by the UI', () => {
    expect(
      formatErrorSummary({
        error: {
          code: 'SERVER_ERROR',
          message: 'Unable to save changes',
          reason: 'The server rejected the request.',
          solution: 'Retry in a moment.',
          status: 500,
          timestamp: '2026-04-29T00:00:00.000Z',
          path: '/api/save',
          requestId: 'req-99',
        },
      }),
    ).toEqual({
      title: 'Unable to save changes',
      reason: 'The server rejected the request.',
      solution: 'Retry in a moment.',
      code: 'SERVER_ERROR',
      status: 500,
      requestId: 'req-99',
    });
  });
});
