import { apiClient } from '@/services/apiClient';
import type { RawQueueEntry } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchQueue(): Promise<RawQueueEntry[]> {
  const { data } = await apiClient.get<ApiEnvelope<RawQueueEntry[]>>('/queue');
  return data.data;
}

export async function createWalkIn(input: {
  providerServiceId: number;
  customerName: string;
}): Promise<RawQueueEntry> {
  const { data } = await apiClient.post<ApiEnvelope<RawQueueEntry>>('/queue', input);
  return data.data;
}

export async function createFromBooking(bookingId: number): Promise<RawQueueEntry> {
  const { data } = await apiClient.post<ApiEnvelope<RawQueueEntry>>('/queue', { bookingId });
  return data.data;
}

export async function updateQueueStatus(
  id: number,
  status: 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED',
): Promise<RawQueueEntry> {
  const { data } = await apiClient.patch<ApiEnvelope<RawQueueEntry>>(`/queue/${id}`, { status });
  return data.data;
}

export async function reorderQueue(orderedIds: number[]): Promise<RawQueueEntry[]> {
  const { data } = await apiClient.patch<ApiEnvelope<RawQueueEntry[]>>('/queue/reorder', {
    orderedIds,
  });
  return data.data;
}

export async function removeQueueEntry(id: number): Promise<void> {
  await apiClient.delete(`/queue/${id}`);
}

// The provider's own services, to populate the walk-in service picker with
// real data instead of the old static category list. There's no dedicated
// "my own provider profile" endpoint yet (a known gap outside Queue's
// scope), so this reuses the public /providers listing and picks out the
// caller's own business by matching the linked user id.
export interface OwnProviderService {
  id: number;
  name: string;
}

interface RawProviderListItem {
  user: { id: number };
  services: { id: number; name: string }[];
}

export async function fetchOwnProviderServices(userId: number): Promise<OwnProviderService[]> {
  const { data } = await apiClient.get<ApiEnvelope<RawProviderListItem[]>>('/providers');
  const own = data.data.find((provider) => provider.user.id === userId);
  return own ? own.services.map((s) => ({ id: s.id, name: s.name })) : [];
}
