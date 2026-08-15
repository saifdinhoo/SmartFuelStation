import { CalendarCheck, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatCard } from '@/components/dashboard/StatCard';
import { useSocketStatus } from '@/app/providers/SocketProvider';
import { useProviderBookings } from './useProviderBookings';
import { ProviderBookingRow } from './ProviderBookingRow';
import { DATE_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from './types';

export function ProviderBookingsPage() {
  const {
    viewState,
    errorMessage,
    bookings,
    totalCount,
    counts,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    search,
    setSearch,
    hasActiveFilters,
    clearFilters,
    reload,
  } = useProviderBookings();
  const { connected } = useSocketStatus();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-heading-2">Bookings</h1>
            <span
              className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                connected ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-success' : 'bg-muted-foreground'}`}
              />
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <p className="text-body-sm text-muted-foreground">
            Confirm requests, check customers in, and move them into the queue.
          </p>
        </div>
      </div>

      {viewState === 'error' && (
        <ErrorState
          title="Could not load bookings"
          description={errorMessage ?? undefined}
          onRetry={reload}
        />
      )}

      {viewState !== 'error' && (
        <>
          <Reveal className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Pending" value={counts.pending} icon={Clock} />
            <StatCard label="Confirmed" value={counts.confirmed} icon={CheckCircle2} />
            <StatCard label="Arrived" value={counts.arrived} icon={CalendarCheck} />
            <StatCard label="In queue / service" value={counts.active} icon={PlayCircle} />
          </Reveal>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <SearchInput
                label="Search bookings"
                hideLabel
                placeholder="Search by customer or service…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              label="Status"
              hideLabel
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_FILTER_OPTIONS}
            />
            <Select
              label="Date"
              hideLabel
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              options={DATE_FILTER_OPTIONS}
            />
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>

          {viewState === 'loading' && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          )}

          {viewState === 'ready' && totalCount === 0 && (
            <EmptyState
              icon={CalendarCheck}
              title="No bookings yet"
              description="When customers book one of your services, their requests will appear here."
            />
          )}

          {viewState === 'ready' && totalCount > 0 && bookings.length === 0 && (
            <EmptyState
              icon={CalendarCheck}
              title="No bookings match these filters"
              description="Try a different status or date range."
              action={{ label: 'Clear filters', onClick: clearFilters }}
            />
          )}

          {viewState === 'ready' && bookings.length > 0 && (
            <Reveal delay={0.05} className="flex flex-col gap-3">
              {bookings.map((booking) => (
                <ProviderBookingRow key={booking.id} booking={booking} />
              ))}
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}
