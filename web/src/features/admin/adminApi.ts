import { apiClient } from '@/services/apiClient';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
export type ComplaintSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AdminAnalyticsRange = '7d' | '30d' | '90d';

// --- overview --------------------------------------------------------------

export interface AdminOverview {
  users: { total: number; customers: number; providerAccounts: number; admins: number };
  providers: { total: number; approved: number; pending: number; openNow: number };
  bookings: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    rejected: number;
  };
  reviews: { total: number; averageRating: number | null };
  queue: { activeEntries: number };
  catalog: { categories: number; activeCategories: number; services: number };
  complaints: { open: number; total: number };
  recentRegistrations: { id: number; name: string; role: UserRole; createdAt: string }[];
  pendingProviders: {
    id: number;
    businessName: string;
    address: string;
    createdAt: string;
    user: { id: number; name: string; email: string };
  }[];
  recentComplaints: {
    id: number;
    subject: string;
    severity: ComplaintSeverity;
    status: ComplaintStatus;
    createdAt: string;
    submittedBy: { id: number; name: string };
    provider: { id: number; businessName: string };
  }[];
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data } = await apiClient.get<ApiEnvelope<AdminOverview>>('/admin/overview');
  return data.data;
}

// --- analytics -------------------------------------------------------------

export interface AdminAnalytics {
  range: AdminAnalyticsRange;
  since: string;
  summary: {
    bookings: number;
    completed: number;
    cancelled: number;
    cancellationRate: number;
    newCustomers: number;
    newProviders: number;
    reviews: number;
    averageRating: number | null;
  };
  bookingTrend: { label: string; bookings: number }[];
  userGrowth: { label: string; customers: number; providers: number }[];
  statusBreakdown: { status: string; count: number }[];
  popularServices: { service: string; bookings: number }[];
  topProviders: { provider: string; bookings: number }[];
  providerCategories: { category: string; count: number }[];
}

export async function fetchAdminAnalytics(range: AdminAnalyticsRange): Promise<AdminAnalytics> {
  const { data } = await apiClient.get<ApiEnvelope<AdminAnalytics>>('/admin/analytics', {
    params: { range },
  });
  return data.data;
}

// --- users -----------------------------------------------------------------

export interface AdminUserListItem {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  createdAt: string;
  provider: { id: number; businessName: string; isApproved: boolean } | null;
  _count: { bookings: number; reviews: number };
}

export interface AdminUserDetail extends Omit<AdminUserListItem, 'provider' | '_count'> {
  updatedAt: string;
  provider: {
    id: number;
    businessName: string;
    address: string;
    isApproved: boolean;
    isOpen: boolean;
    _count: { services: number; reviews: number };
  } | null;
  bookings: {
    id: number;
    status: string;
    scheduledAt: string;
    providerService: { name: string };
  }[];
  reviews: { id: number; rating: number; comment: string | null; createdAt: string }[];
  _count: { bookings: number; reviews: number; complaints: number };
}

export async function fetchAdminUsers(params: {
  role?: string;
  search?: string;
}): Promise<AdminUserListItem[]> {
  const { data } = await apiClient.get<ApiEnvelope<AdminUserListItem[]>>('/admin/users', {
    params,
  });
  return data.data;
}

export async function fetchAdminUser(id: number | string): Promise<AdminUserDetail> {
  const { data } = await apiClient.get<ApiEnvelope<AdminUserDetail>>(`/admin/users/${id}`);
  return data.data;
}

// --- reviews ---------------------------------------------------------------

export interface AdminReview {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  bookingId: number | null;
  customer: { id: number; name: string; email: string };
  provider: { id: number; businessName: string };
}

export async function fetchAdminReviews(params: {
  rating?: string;
  providerId?: number;
}): Promise<AdminReview[]> {
  const { data } = await apiClient.get<ApiEnvelope<AdminReview[]>>('/admin/reviews', { params });
  return data.data;
}

// Reuses the pre-existing DELETE /reviews/:id, which already permits ADMIN.
export async function deleteReview(id: number): Promise<void> {
  await apiClient.delete(`/reviews/${id}`);
}

// --- complaints ------------------------------------------------------------

export interface AdminComplaint {
  id: number;
  subject: string;
  details: string | null;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  submittedBy: { id: number; name: string; email: string; role: UserRole };
  provider: { id: number; businessName: string };
}

export async function fetchAdminComplaints(params: {
  status?: string;
  severity?: string;
}): Promise<AdminComplaint[]> {
  const { data } = await apiClient.get<ApiEnvelope<AdminComplaint[]>>('/admin/complaints', {
    params,
  });
  return data.data;
}

export async function updateComplaintStatus(
  id: number,
  status: ComplaintStatus,
): Promise<AdminComplaint> {
  const { data } = await apiClient.patch<ApiEnvelope<AdminComplaint>>(`/admin/complaints/${id}`, {
    status,
  });
  return data.data;
}

// --- providers -------------------------------------------------------------
// Approve/revoke in one call. The older PATCH /providers/:id/approve is left
// untouched for the existing approvals list.

export async function setProviderApproval(id: number, isApproved: boolean) {
  const { data } = await apiClient.patch<ApiEnvelope<{ id: number; isApproved: boolean }>>(
    `/providers/${id}/approval`,
    { isApproved },
  );
  return data.data;
}
