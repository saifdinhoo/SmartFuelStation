export interface AdminOverviewSummary {
  totalCustomers: number;
  totalProviders: number;
  pendingApprovals: number;
  activeBookings: number;
  openComplaints: number;
  averageRating: number;
}

export interface UserGrowthPoint {
  label: string;
  customers: number;
  providers: number;
}

export interface PlatformBookingPoint {
  label: string;
  bookings: number;
}

export interface ProviderCategoryPoint {
  category: string;
  count: number;
}

export type RegistrationRole = 'CUSTOMER' | 'PROVIDER';

export interface RegistrationActivityItem {
  id: string;
  name: string;
  role: RegistrationRole;
  date: string;
}

export type ComplaintSeverity = 'low' | 'medium' | 'high';

export interface ComplaintItem {
  id: string;
  subject: string;
  submittedBy: string;
  againstProvider: string;
  severity: ComplaintSeverity;
  date: string;
}

export interface PendingApprovalItem {
  id: string;
  businessName: string;
  category: string;
  submittedDate: string;
}

export type PlatformHealthStatus = 'operational' | 'degraded' | 'down';

export interface AdminOverviewData {
  summary: AdminOverviewSummary;
  userGrowth: UserGrowthPoint[];
  bookingTrend: PlatformBookingPoint[];
  providerCategories: ProviderCategoryPoint[];
  recentRegistrations: RegistrationActivityItem[];
  recentComplaints: ComplaintItem[];
  pendingApprovals: PendingApprovalItem[];
  platformHealth: PlatformHealthStatus;
}
