import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatCard } from '@/components/dashboard/StatCard';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchBookings } from '@/features/customer/bookings/bookingsApi';
import { BookingStatusBadge } from '@/features/customer/bookings/BookingStatusBadge';
import {
  DATE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from '@/features/provider/bookings/types';

function matchesDate(scheduledAt: string, filter: string, now: number): boolean {
  if (filter === 'ALL') return true;
  const at = new Date(scheduledAt).getTime();
  if (filter === 'TODAY') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return at >= start.getTime() && at <= end.getTime();
  }
  if (filter === 'UPCOMING') return at > now;
  if (filter === 'PAST') return at < now;
  return true;
}

export function AdminBookingsPage() {
  // GET /bookings is already platform-wide for an ADMIN caller (see
  // booking.service.js listBookings — no where clause for admins), so this
  // reuses the existing endpoint rather than adding an admin-only twin.
  const query = useQuery({ queryKey: ['bookings'], queryFn: fetchBookings });

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const all = useMemo(() => query.data ?? [], [query.data]);
  const fetchedAt = query.dataUpdatedAt;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all
      .filter((b) => statusFilter === 'ALL' || b.status === statusFilter)
      .filter((b) => matchesDate(b.scheduledAt, dateFilter, fetchedAt))
      .filter((b) =>
        term === ''
          ? true
          : b.customer.name.toLowerCase().includes(term) ||
            b.providerService.name.toLowerCase().includes(term) ||
            b.providerService.provider.businessName.toLowerCase().includes(term),
      )
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  }, [all, statusFilter, dateFilter, search, fetchedAt]);

  const counts = useMemo(
    () => ({
      active: all.filter((b) =>
        ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_QUEUE', 'IN_SERVICE'].includes(b.status),
      ).length,
      completed: all.filter((b) => b.status === 'COMPLETED').length,
      cancelled: all.filter((b) => b.status === 'CANCELLED' || b.status === 'REJECTED').length,
    }),
    [all],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Bookings</h1>
        <p className="text-body-sm text-muted-foreground">
          Every booking across the platform, read-only.
        </p>
      </div>

      {query.isError && (
        <ErrorState
          title="Could not load bookings"
          description={getErrorMessage(query.error, 'Please try again.')}
          onRetry={() => query.refetch()}
        />
      )}

      {!query.isError && (
        <>
          <Reveal className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total" value={all.length} icon={CalendarCheck} />
            <StatCard label="Active" value={counts.active} icon={Clock} />
            <StatCard label="Completed" value={counts.completed} icon={CheckCircle2} />
            <StatCard label="Cancelled" value={counts.cancelled} icon={XCircle} />
          </Reveal>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <SearchInput
                label="Search bookings"
                hideLabel
                placeholder="Search by customer, service or business…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              label="Status"
              hideLabel
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
            <Select
              label="Date"
              hideLabel
              options={DATE_FILTER_OPTIONS}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {query.isPending && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          )}

          {!query.isPending && filtered.length === 0 && (
            <EmptyState
              icon={CalendarCheck}
              title={all.length === 0 ? 'No bookings yet' : 'No bookings match'}
              description={
                all.length === 0
                  ? 'Bookings made by customers will appear here.'
                  : 'Try a different status or date filter.'
              }
            />
          )}

          {!query.isPending && filtered.length > 0 && (
            <Reveal delay={0.05} className="flex flex-col gap-2">
              {filtered.map((b) => (
                <Card key={b.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {b.customer.name} → {b.providerService.provider.businessName}
                      </p>
                      <p className="text-caption">
                        {b.providerService.name} · {new Date(b.scheduledAt).toLocaleString()} · $
                        {b.priceAtBooking}
                      </p>
                    </div>
                    <BookingStatusBadge status={b.status} />
                  </CardContent>
                </Card>
              ))}
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}
