import { SERVICE_CATEGORIES } from '@/features/provider/services/types';
import type {
  AnalyticsData,
  BookingTrendPoint,
  BusyHourPoint,
  DateRangeKey,
  PopularServicePoint,
  RatingDistributionPoint,
} from './types';

// No backend reporting endpoints yet — this feature is explicitly mock-only.
// Summary numbers are derived from the generated chart series (not sampled
// independently) so the page never shows internally-inconsistent totals.

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FAILURE_CHANCE = 0.15;

function maybeFail(message: string) {
  if (Math.random() < FAILURE_CHANCE) {
    throw new Error(message);
  }
}

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

const DAY_COUNT: Record<DateRangeKey, number> = { '7d': 7, '30d': 30, '90d': 90 };

function buildTrend(range: DateRangeKey): BookingTrendPoint[] {
  const days = DAY_COUNT[range];
  // Bucket the 90-day view into weeks so the chart stays readable.
  const step = range === '90d' ? 7 : 1;
  const [min, max] = range === '90d' ? [20, 55] : [3, 14];
  const today = new Date();
  const points: BookingTrendPoint[] = [];

  for (let daysAgo = days - step; daysAgo >= 0; daysAgo -= step) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const label =
      range === '90d'
        ? `Wk of ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    points.push({ label, bookings: randomBetween(min, max) });
  }

  return points;
}

function buildPopularServices(): PopularServicePoint[] {
  return [...SERVICE_CATEGORIES]
    .map((service) => ({ service, bookings: randomBetween(8, 60) }))
    .sort((a, b) => b.bookings - a.bookings);
}

function buildBusyHours(): BusyHourPoint[] {
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  return hours.map((hour) => ({
    hour: `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? 'AM' : 'PM'}`,
    bookings: randomBetween(2, 30),
  }));
}

function buildRatingDistribution(): RatingDistributionPoint[] {
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: randomBetween(stars >= 4 ? 20 : 1, stars >= 4 ? 80 : 12),
  }));
}

export async function fetchAnalytics(range: DateRangeKey): Promise<AnalyticsData> {
  await delay(600);
  maybeFail('Failed to load analytics');

  const trend = buildTrend(range);
  const popularServices = buildPopularServices();
  const busyHours = buildBusyHours();
  const ratingDistribution = buildRatingDistribution();

  const totalBookings = trend.reduce((sum, point) => sum + point.bookings, 0);
  const cancelledBookings = Math.round(totalBookings * (0.05 + Math.random() * 0.1));
  const noShowBookings = Math.round(totalBookings * (0.02 + Math.random() * 0.04));
  const pendingBookings = Math.round(totalBookings * 0.03);
  const completedBookings = Math.max(
    0,
    totalBookings - cancelledBookings - noShowBookings - pendingBookings,
  );

  const totalRatingVotes = ratingDistribution.reduce((sum, r) => sum + r.count, 0);
  const averageRating =
    totalRatingVotes > 0
      ? ratingDistribution.reduce((sum, r) => sum + r.stars * r.count, 0) / totalRatingVotes
      : 0;

  return {
    summary: {
      totalBookings,
      completedBookings,
      cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
      averageWaitMinutes: randomBetween(12, 35),
      averageRating: Math.round(averageRating * 10) / 10,
      revenueEstimate: completedBookings * randomBetween(35, 70),
    },
    trend,
    popularServices,
    busyHours,
    statusBreakdown: [
      { status: 'Completed', count: completedBookings },
      { status: 'Cancelled', count: cancelledBookings },
      { status: 'No-show', count: noShowBookings },
      { status: 'Pending', count: pendingBookings },
    ],
    ratingDistribution,
  };
}
