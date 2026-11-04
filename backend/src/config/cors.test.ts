import { getAllowedOrigins, isOriginAllowed } from './cors';

describe('CORS origin allow-list', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('allows the configured frontend URL, ignoring a trailing slash', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://xchango-theta.vercel.app/';
    expect(isOriginAllowed('https://xchango-theta.vercel.app')).toBe(true);
  });

  it('rejects other origins', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://xchango-theta.vercel.app';
    expect(isOriginAllowed('https://evil.example.com')).toBe(false);
  });

  it('allows requests with no Origin header', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://xchango-theta.vercel.app';
    expect(isOriginAllowed(undefined)).toBe(true);
  });

  it('allows localhost only outside production', () => {
    process.env.FRONTEND_URL = 'https://xchango-theta.vercel.app';
    process.env.NODE_ENV = 'production';
    expect(isOriginAllowed('http://localhost:5173')).toBe(false);
    process.env.NODE_ENV = 'development';
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
  });

  it('supports several comma-separated frontend URLs', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://a.example.com, https://b.example.com/';
    expect(getAllowedOrigins()).toEqual(['https://a.example.com', 'https://b.example.com']);
  });
});
