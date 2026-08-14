import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchBookings } from './bookingsApi';
import { TERMINAL_STATUSES } from './types';

export function useBookings() {
  const query = useQuery({
    queryKey: ['bookings'],
    queryFn: fetchBookings,
  });

  const bookings = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    [query.data],
  );

  const active = useMemo(
    () => bookings.filter((b) => !TERMINAL_STATUSES.includes(b.status)),
    [bookings],
  );
  const history = useMemo(
    () => bookings.filter((b) => TERMINAL_STATUSES.includes(b.status)),
    [bookings],
  );

  return {
    active,
    history,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError ? getErrorMessage(query.error, 'Could not load bookings') : null,
    reload: query.refetch,
  };
}
