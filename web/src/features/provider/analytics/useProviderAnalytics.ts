import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  fetchOwnAnalytics,
  type AnalyticsRange,
} from '@/features/provider/profile/providerProfileApi';

export type AnalyticsViewState = 'loading' | 'error' | 'ready';

// Every figure comes from GET /providers/me/analytics, which computes from
// Booking / QueueEntry / Review rows. There is no client-side derivation
// and no fallback data — an empty database produces zeroes, not samples.
export function useProviderAnalytics() {
  const [range, setRange] = useState<AnalyticsRange>('30d');

  const query = useQuery({
    queryKey: ['provider', 'me', 'analytics', range],
    queryFn: () => fetchOwnAnalytics(range),
  });

  const data = query.data;
  const viewState: AnalyticsViewState = query.isPending
    ? 'loading'
    : query.isError
      ? 'error'
      : 'ready';

  return {
    range,
    setRange,
    data,
    viewState,
    errorMessage: query.isError ? getErrorMessage(query.error, 'Could not load analytics') : null,
    // "Empty" means this provider genuinely had no bookings in the window.
    isEmpty: Boolean(data) && data!.summary.totalBookings === 0,
    retry: () => query.refetch(),
  };
}
