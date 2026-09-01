import { apiClient } from '@/services/apiClient';
import type { LoginFormValues } from './authSchema';
import type { RegisterFormValues } from './registerSchema';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
}

interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: AuthUser;
  };
}

export async function login(values: LoginFormValues) {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', values);
  return data.data;
}

export async function register(values: RegisterFormValues) {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', values);
  return data.data;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<{ success: boolean; data: AuthUser }>('/auth/me');
  return data.data;
}

export async function changePassword(values: {
  currentPassword: string;
  newPassword: string;
}) {
  await apiClient.patch<{ success: boolean; data: { message: string } }>(
    '/auth/change-password',
    values,
  );
}

// Always resolves on 200 — the backend gives the exact same generic
// response whether or not the email belongs to a real account, so there
// is nothing here to distinguish.
export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post<{ success: boolean; data: { message: string } }>(
    '/auth/forgot-password',
    { email },
  );
}

// Rejects (via apiClient's normal error handling) for an invalid/expired/
// already-used token or a too-short password — the caller surfaces
// whatever message the backend sends back.
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post<{ success: boolean; data: { message: string } }>(
    '/auth/reset-password',
    { token, newPassword },
  );
}
