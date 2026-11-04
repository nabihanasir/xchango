import type { CorsOptions } from 'cors';

const LOCAL_DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const normalize = (origin: string) => origin.trim().replace(/\/+$/, '');

/**
 * Origins allowed to call the API from a browser: every URL in FRONTEND_URL
 * (comma-separated, trailing slashes ignored) plus local Vite dev servers
 * unless NODE_ENV is "production".
 */
export const getAllowedOrigins = (): string[] => {
  const configured = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(normalize)
    .filter(Boolean);
  const local = process.env.NODE_ENV === 'production' ? [] : LOCAL_DEV_ORIGINS;
  return [...new Set([...configured, ...local])];
};

export const isOriginAllowed = (origin: string | undefined): boolean => {
  // Non-browser clients (Postman, curl, health checks) send no Origin header.
  if (!origin) return true;
  return getAllowedOrigins().includes(normalize(origin));
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
};
