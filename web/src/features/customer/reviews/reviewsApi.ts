import { apiClient } from '@/services/apiClient';
import type { CreateReviewInput, MyReview } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchMyReviews(): Promise<MyReview[]> {
  const { data } = await apiClient.get<ApiEnvelope<MyReview[]>>('/reviews/me');
  return data.data;
}

export async function createReview(input: CreateReviewInput): Promise<MyReview> {
  const { data } = await apiClient.post<ApiEnvelope<MyReview>>('/reviews', input);
  return data.data;
}

export async function deleteReview(id: number): Promise<void> {
  await apiClient.delete(`/reviews/${id}`);
}
