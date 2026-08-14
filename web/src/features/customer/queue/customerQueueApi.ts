import { apiClient } from '@/services/apiClient';
import type { MyQueueEntry, QueueSummary } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// The backend scopes this to the caller's own entries when the caller is
// a CUSTOMER (see queue.service.js) — same endpoint the provider Queue
// page uses, just a different view of it depending on role.
export async function fetchMyQueueEntries(): Promise<MyQueueEntry[]> {
  const { data } = await apiClient.get<ApiEnvelope<MyQueueEntry[]>>('/queue');
  return data.data;
}

export async function fetchQueueSummary(providerId: number | string): Promise<QueueSummary> {
  const { data } = await apiClient.get<ApiEnvelope<QueueSummary>>(`/queue/summary/${providerId}`);
  return data.data;
}
