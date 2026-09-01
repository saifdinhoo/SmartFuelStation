import { apiClient } from '@/services/apiClient';
import type { Availability, OperatingHourEntry } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchOwnHours(): Promise<OperatingHourEntry[]> {
  const { data } = await apiClient.get<ApiEnvelope<OperatingHourEntry[]>>('/providers/me/hours');
  return data.data;
}

export async function updateOwnHours(
  entries: OperatingHourEntry[],
): Promise<OperatingHourEntry[]> {
  const { data } = await apiClient.put<ApiEnvelope<OperatingHourEntry[]>>(
    '/providers/me/hours',
    entries,
  );
  return data.data;
}

export async function fetchProviderHours(providerId: number | string): Promise<OperatingHourEntry[]> {
  const { data } = await apiClient.get<ApiEnvelope<OperatingHourEntry[]>>(
    `/providers/${providerId}/hours`,
  );
  return data.data;
}

export async function fetchAvailability(
  providerId: number | string,
  serviceId: number,
  date: string,
): Promise<Availability> {
  const { data } = await apiClient.get<ApiEnvelope<Availability>>(
    `/providers/${providerId}/availability`,
    { params: { serviceId, date } },
  );
  return data.data;
}
