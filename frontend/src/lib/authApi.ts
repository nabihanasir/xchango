import { apiFetch } from './fetchClient';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  token: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  sapId: string;
  role: string;
  password: string;
}

export const authApi = {
  login: (payload: { email: string; password: string }) => apiFetch<AuthUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  register: (payload: RegisterPayload) => apiFetch<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};
