import { apiClient } from '@/services/apiClient';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface OwnProviderService {
  id: number;
  name: string;
  price: number;
  durationMinutes: number;
  isAvailable: boolean;
  categoryId: number;
  category: { id: number; name: string; isActive: boolean };
}

export interface OwnProviderProfile {
  id: number;
  userId: number;
  businessName: string;
  address: string;
  description: string | null;
  isApproved: boolean;
  isOpen: boolean;
  latitude: number | null;
  longitude: number | null;
  estimatedWaitMinutes: number;
  createdAt: string;
  updatedAt: string;
  user: { id: number; name: string; email: string; phone: string | null };
  services: OwnProviderService[];
  rating: { averageRating: number | null; reviewCount: number };
}

export interface ProviderProfileUpdate {
  businessName?: string;
  address?: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isOpen?: boolean;
  estimatedWaitMinutes?: number;
  name?: string;
  phone?: string | null;
}

export async function fetchOwnProfile(): Promise<OwnProviderProfile> {
  const { data } = await apiClient.get<ApiEnvelope<OwnProviderProfile>>('/providers/me');
  return data.data;
}

export async function updateOwnProfile(
  input: ProviderProfileUpdate,
): Promise<OwnProviderProfile> {
  const { data } = await apiClient.patch<ApiEnvelope<OwnProviderProfile>>('/providers/me', input);
  return data.data;
}

export interface ServiceWriteInput {
  name: string;
  price: number;
  durationMinutes: number;
  categoryId: number;
  isAvailable?: boolean;
}

export async function createOwnService(input: ServiceWriteInput): Promise<OwnProviderService> {
  const { data } = await apiClient.post<ApiEnvelope<OwnProviderService>>(
    '/providers/me/services',
    input,
  );
  return data.data;
}

export async function updateOwnService(
  serviceId: number,
  input: Partial<ServiceWriteInput>,
): Promise<OwnProviderService> {
  const { data } = await apiClient.patch<ApiEnvelope<OwnProviderService>>(
    `/providers/me/services/${serviceId}`,
    input,
  );
  return data.data;
}

export async function deleteOwnService(serviceId: number): Promise<void> {
  await apiClient.delete(`/providers/me/services/${serviceId}`);
}

// --- analytics -------------------------------------------------------------

export type AnalyticsRange = '7d' | '30d' | '90d';

export interface ProviderAnalytics {
  range: AnalyticsRange;
  since: string;
  summary: {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    cancellationRate: number;
    averageWaitMinutes: number;
    averageRating: number | null;
    reviewCount: number;
    queueEntriesHandled: number;
  };
  trend: { label: string; bookings: number }[];
  popularServices: { service: string; bookings: number }[];
  busyHours: { hour: string; bookings: number }[];
  statusBreakdown: { status: string; count: number }[];
  ratingDistribution: { stars: number; count: number }[];
}

export async function fetchOwnAnalytics(range: AnalyticsRange): Promise<ProviderAnalytics> {
  const { data } = await apiClient.get<ApiEnvelope<ProviderAnalytics>>('/providers/me/analytics', {
    params: { range },
  });
  return data.data;
}

// --- reviews ---------------------------------------------------------------
// Reuses the pre-existing provider-scoped review endpoints; the provider's
// own id comes from /providers/me, never from client input.

export interface ProviderReview {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: { id: number; name: string };
}

export async function fetchOwnReviews(providerId: number): Promise<ProviderReview[]> {
  const { data } = await apiClient.get<ApiEnvelope<ProviderReview[]>>(
    `/providers/${providerId}/reviews`,
  );
  return data.data;
}

// --- account deactivation ---------------------------------------------------
// Not a delete: the backend only flips User.isActive and closes the
// business (Provider.isOpen = false). Every service/booking/review/finance/
// fuel/queue record is left untouched — see providerProfile.service.js's
// deactivateOwnAccount.
export async function deactivateOwnAccount(): Promise<void> {
  await apiClient.post('/providers/me/deactivate');
}
