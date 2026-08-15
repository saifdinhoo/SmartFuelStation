import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchBookings } from '@/features/customer/bookings/bookingsApi';
import { BOOKINGS_QUERY_KEY } from './useProviderBookingActions';
import type { Booking } from './types';

export type ProviderBookingsViewState = 'loading' | 'error' | 'ready';

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function matchesDateFilter(booking: Booking, filter: string): boolean {
  if (filter === 'ALL') return true;
  const at = new Date(booking.scheduledAt).getTime();
  if (filter === 'TODAY') return at >= startOfToday() && at <= endOfToday();
  if (filter === 'UPCOMING') return at > Date.now();
  if (filter === 'PAST') return at < Date.now();
  return true;
}

// GET /bookings takes no query parameters — it returns exactly this
// provider's bookings (scoped server-side in booking.service.js by the
// caller's linked providerId) and nothing else. Filtering is therefore
// done here over that already-scoped list; it is a view concern, not a
// second source of truth, and never widens what the server returned.
export function useProviderBookings() {
  const query = useQuery({ queryKey: BOOKINGS_QUERY_KEY, queryFn: fetchBookings });

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Memoized so the `?? []` fallback doesn't hand the memos below a fresh
  // array identity on every render while the query is still pending.
  const all = useMemo(() => query.data ?? [], [query.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all
      .filter((b) => statusFilter === 'ALL' || b.status === statusFilter)
      .filter((b) => matchesDateFilter(b, dateFilter))
      .filter((b) =>
        term === ''
          ? true
          : b.customer.name.toLowerCase().includes(term) ||
            b.providerService.name.toLowerCase().includes(term),
      )
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  }, [all, statusFilter, dateFilter, search]);

  const counts = useMemo(
    () => ({
      pending: all.filter((b) => b.status === 'PENDING').length,
      confirmed: all.filter((b) => b.status === 'CONFIRMED').length,
      arrived: all.filter((b) => b.status === 'ARRIVED').length,
      active: all.filter((b) => b.status === 'IN_QUEUE' || b.status === 'IN_SERVICE').length,
    }),
    [all],
  );

  const viewState: ProviderBookingsViewState = query.isPending
    ? 'loading'
    : query.isError
      ? 'error'
      : 'ready';

  return {
    viewState,
    errorMessage: query.isError ? getErrorMessage(query.error, 'Could not load bookings') : null,
    bookings: filtered,
    totalCount: all.length,
    counts,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    search,
    setSearch,
    hasActiveFilters: statusFilter !== 'ALL' || dateFilter !== 'ALL' || search.trim() !== '',
    clearFilters: () => {
      setStatusFilter('ALL');
      setDateFilter('ALL');
      setSearch('');
    },
    reload: () => query.refetch(),
  };
}
