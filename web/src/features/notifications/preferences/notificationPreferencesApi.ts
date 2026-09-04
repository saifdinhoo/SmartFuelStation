import { apiClient } from '@/services/apiClient';
import type { NotificationPreferences, NotificationPreferencesInput } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// User-scoped, not admin-scoped — the backend resolves the caller from the
// verified JWT (see notification.controller.js), so this is always "my own"
// preferences regardless of which UI surface calls it.
export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await apiClient.get<ApiEnvelope<NotificationPreferences>>('/notifications/preferences');
  return data.data;
}

export async function updateNotificationPreferences(
  input: NotificationPreferencesInput,
): Promise<NotificationPreferences> {
  const { data } = await apiClient.patch<ApiEnvelope<NotificationPreferences>>(
    '/notifications/preferences',
    input,
  );
  return data.data;
}
