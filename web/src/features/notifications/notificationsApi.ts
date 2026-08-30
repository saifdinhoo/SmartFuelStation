import { apiClient } from '@/services/apiClient';
import type { Notification } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<ApiEnvelope<Notification[]>>('/notifications');
  return data.data;
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export async function markNotificationRead(id: number): Promise<Notification> {
  const { data } = await apiClient.patch<ApiEnvelope<Notification>>(`/notifications/${id}/read`);
  return data.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}

export async function deleteNotification(id: number): Promise<void> {
  await apiClient.delete(`/notifications/${id}`);
}
