import { apiClient } from '@/services/apiClient';
import type { AdminProvider } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchProviders(): Promise<AdminProvider[]> {
  const { data } = await apiClient.get<ApiEnvelope<AdminProvider[]>>('/providers');
  return data.data;
}

export async function approveProvider(id: number): Promise<AdminProvider> {
  const { data } = await apiClient.patch<ApiEnvelope<AdminProvider>>(`/providers/${id}/approve`);
  return data.data;
}
