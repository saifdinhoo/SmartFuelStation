import type { AnalyticsRange } from '@/features/provider/profile/providerProfileApi';

export type DateRangeKey = AnalyticsRange;

export const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

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

// Real BookingStatus values straight from the database — no invented
// "No-show" bucket, which the schema has no concept of.
export interface BookingStatusSlice {
  status: string;
  count: number;
}

export interface RatingDistributionPoint {
  stars: number;
  count: number;
}
