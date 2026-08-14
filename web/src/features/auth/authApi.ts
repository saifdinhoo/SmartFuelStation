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
