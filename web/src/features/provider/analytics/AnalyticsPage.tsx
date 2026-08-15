import {
  CalendarRange,
  CheckCircle2,
  Clock,
  Download,
  ListOrdered,
  Star,
  TicketX,
} from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Tooltip } from '@/components/ui/Tooltip';
import { StatCard } from '@/components/dashboard/StatCard';
import { useProviderAnalytics } from './useProviderAnalytics';
import { BookingTrendChart } from './BookingTrendChart';
import { PopularServicesChart } from './PopularServicesChart';
import { BusyHoursChart } from './BusyHoursChart';
import { BookingStatusChart } from './BookingStatusChart';
import { CustomerSatisfactionSection } from './CustomerSatisfactionSection';
import { DATE_RANGE_OPTIONS, type DateRangeKey } from './types';

export function AnalyticsPage() {
  const { range, setRange, data, viewState, isEmpty, errorMessage, retry } = useProviderAnalytics();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-2">Analytics</h1>
          <p className="text-body-sm text-muted-foreground">
            Track bookings, demand patterns, and customer satisfaction over time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            label="Date range"
            hideLabel
            options={DATE_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={range}
            onChange={(e) => setRange(e.target.value as DateRangeKey)}
            className="w-40"
          />
          <Tooltip label="Export is a planned feature — coming soon">
            <Button variant="secondary" disabled aria-disabled title="Coming soon">
              <Download className="h-4 w-4" />
              Export
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Soon
              </span>
            </Button>
          </Tooltip>
        </div>
      </div>

      {viewState === 'error' && (
        <ErrorState
          onRetry={retry}
          description={errorMessage ?? 'Could not load analytics.'}
        />
      )}

      {viewState === 'loading' && (
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
          <Skeleton className="h-48 rounded-lg" />
        </div>
      )}

      {viewState === 'ready' && data && isEmpty && (
        <EmptyState
          title="No bookings in this range"
          description="Try a different date range, or check back once bookings come in."
        />
      )}

      {viewState === 'ready' && data && !isEmpty && (
        <Reveal className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Total bookings"
              value={data.summary.totalBookings}
              icon={CalendarRange}
            />
            <StatCard
              label="Completed"
              value={data.summary.completedBookings}
              icon={CheckCircle2}
            />
            <StatCard
              label="Cancellation rate"
              value={`${data.summary.cancellationRate.toFixed(1)}%`}
              icon={TicketX}
            />
            <StatCard
              label="Avg. wait"
              value={`${data.summary.averageWaitMinutes} min`}
              icon={Clock}
            />
            <StatCard
              label="Avg. rating"
              value={
                data.summary.averageRating === null ? '—' : data.summary.averageRating.toFixed(1)
              }
              icon={Star}
            />
            <StatCard
              label="Queue entries"
              value={data.summary.queueEntriesHandled}
              icon={ListOrdered}
              hint="Customers who joined your queue in this period, including walk-ins."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BookingTrendChart data={data.trend} />
            <PopularServicesChart data={data.popularServices} />
            <BusyHoursChart data={data.busyHours} />
            <BookingStatusChart data={data.statusBreakdown} />
          </div>

          <CustomerSatisfactionSection
            averageRating={data.summary.averageRating}
            distribution={data.ratingDistribution}
          />
        </Reveal>
      )}
    </div>
  );
}
