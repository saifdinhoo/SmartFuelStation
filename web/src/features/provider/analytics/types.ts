export type DateRangeKey = '7d' | '30d' | '90d';

export const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export interface AnalyticsSummary {
  totalBookings: number;
  completedBookings: number;
  cancellationRate: number;
  averageWaitMinutes: number;
  averageRating: number;
  revenueEstimate: number;
}

export interface BookingTrendPoint {
  label: string;
  bookings: number;
}

export interface PopularServicePoint {
  service: string;
  bookings: number;
}

export interface BusyHourPoint {
  hour: string;
  bookings: number;
}

export type BookingStatus = 'Completed' | 'Cancelled' | 'No-show' | 'Pending';

export interface BookingStatusSlice {
  status: BookingStatus;
  count: number;
}

export interface RatingDistributionPoint {
  stars: number;
  count: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  trend: BookingTrendPoint[];
  popularServices: PopularServicePoint[];
  busyHours: BusyHourPoint[];
  statusBreakdown: BookingStatusSlice[];
  ratingDistribution: RatingDistributionPoint[];
}
