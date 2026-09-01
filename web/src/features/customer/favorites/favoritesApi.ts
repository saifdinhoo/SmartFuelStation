import { apiClient } from '@/services/apiClient';
import type { MyFavorite } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchMyFavorites(): Promise<MyFavorite[]> {
  const { data } = await apiClient.get<ApiEnvelope<MyFavorite[]>>('/favorites/me');
  return data.data;
}

export async function addFavorite(providerId: number): Promise<MyFavorite> {
  const { data } = await apiClient.post<ApiEnvelope<MyFavorite>>('/favorites', { providerId });
  return data.data;
}

export async function removeFavorite(providerId: number): Promise<void> {
  await apiClient.delete(`/favorites/${providerId}`);
}
