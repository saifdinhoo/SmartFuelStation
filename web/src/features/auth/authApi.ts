import { apiClient } from '@/services/apiClient';
import type { LoginFormValues } from './authSchema';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
}

interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: AuthUser;
  };
}

export async function login(values: LoginFormValues) {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', values);
  return data.data;
}
