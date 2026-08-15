import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, CheckCircle2, Star, TicketX, UserPlus, Users } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatCard } from '@/components/dashboard/StatCard';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchAdminAnalytics, type AdminAnalyticsRange } from '@/features/admin/adminApi';
import { UserGrowthChart } from '@/features/admin/dashboard/UserGrowthChart';
import { PlatformBookingTrendChart } from '@/features/admin/dashboard/PlatformBookingTrendChart';
import { ProviderCategoryChart } from '@/features/admin/dashboard/ProviderCategoryChart';
import { BookingStatusChart } from '@/features/provider/analytics/BookingStatusChart';
import { PopularServicesChart } from '@/features/provider/analytics/PopularServicesChart';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export function AdminAnalyticsPage() {
  const [range, setRange] = useState<AdminAnalyticsRange>('30d');

  const query = useQuery({
    queryKey: ['admin', 'analytics', range],
    queryFn: () => fetchAdminAnalytics(range),
  });

  const data = query.data;
  const isEmpty = Boolean(data) && data!.summary.bookings === 0 && data!.summary.newCustomers === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-2">Analytics</h1>
          <p className="text-body-sm text-muted-foreground">
            Platform activity, computed from database records.
          </p>
        </div>
        <Select
          label="Date range"
          hideLabel
          options={RANGE_OPTIONS}
          value={range}
          onChange={(e) => setRange(e.target.value as AdminAnalyticsRange)}
          className="w-40"
        />
      </div>

      {query.isError && (
        <ErrorState
          title="Could not load analytics"
          description={getErrorMessage(query.error, 'Please try again.')}
          onRetry={() => query.refetch()}
        />
      )}

      {query.isPending && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {data && isEmpty && (
        <EmptyState
          title="No activity in this range"
          description="Try a wider date range, or check back once bookings and signups come in."
        />
      )}

      {data && !isEmpty && (
        <Reveal className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Bookings" value={data.summary.bookings} icon={CalendarRange} />
            <StatCard label="Completed" value={data.summary.completed} icon={CheckCircle2} />
            <StatCard
              label="Cancellation rate"
              value={`${data.summary.cancellationRate.toFixed(1)}%`}
              icon={TicketX}
            />
            <StatCard label="New customers" value={data.summary.newCustomers} icon={Users} />
            <StatCard label="New providers" value={data.summary.newProviders} icon={UserPlus} />
            <StatCard
              label="Avg. rating"
              value={
                data.summary.averageRating === null ? '—' : data.summary.averageRating.toFixed(1)
              }
              icon={Star}
              hint={`${data.summary.reviews} review${data.summary.reviews === 1 ? '' : 's'} in range`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <UserGrowthChart data={data.userGrowth.map((p) => ({ ...p }))} />
            <PlatformBookingTrendChart data={data.bookingTrend} />
            <BookingStatusChart data={data.statusBreakdown} />
            <ProviderCategoryChart data={data.providerCategories} />
          </div>

          <PopularServicesChart data={data.popularServices} />
        </Reveal>
      )}
    </div>
  );
}
