import { apiClient } from '@/services/apiClient';
import type { RatingSummary, RawCategory, RawProvider, Review } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// GET /providers returns every approved provider (customers never see
// unapproved ones — the backend filters that server-side) with their
// services/categories nested and a review count. There is no dedicated
// "nearby" or "single provider" endpoint, so both the list page and the
// details page read from this same call.
export async function fetchProviders(): Promise<RawProvider[]> {
  const { data } = await apiClient.get<ApiEnvelope<RawProvider[]>>('/providers');
  return data.data;
}

export async function fetchCategories(): Promise<RawCategory[]> {
  const { data } = await apiClient.get<ApiEnvelope<RawCategory[]>>('/categories');
  return data.data;
}

// Computed server-side via Prisma aggregation (see review.service.js) —
// never derived or estimated on the frontend.
export async function fetchRatingSummary(providerId: number | string): Promise<RatingSummary> {
  const { data } = await apiClient.get<ApiEnvelope<RatingSummary>>(
    `/providers/${providerId}/rating-summary`,
  );
  return data.data;
}

export async function fetchProviderReviews(providerId: number | string): Promise<Review[]> {
  const { data } = await apiClient.get<ApiEnvelope<Review[]>>(`/providers/${providerId}/reviews`);
  return data.data;
}
