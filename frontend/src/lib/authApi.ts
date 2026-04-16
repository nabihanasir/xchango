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

export interface ForgotPasswordResponse {
  message: string;
  resetUrl?: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export const authApi = {
  login: (payload: { email: string; password: string }) => apiFetch<AuthUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  forgotPassword: (payload: { email: string }) => apiFetch<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  resetPassword: (token: string, payload: { password: string; confirmPassword: string }) =>
    apiFetch<ResetPasswordResponse>(`/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (payload: RegisterPayload) => apiFetch<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};
