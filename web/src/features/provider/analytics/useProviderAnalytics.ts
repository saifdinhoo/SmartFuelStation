import { useCallback, useEffect, useState } from 'react';
import { fetchAnalytics } from './mockAnalyticsApi';
import type { AnalyticsData, DateRangeKey } from './types';

export type AnalyticsViewState = 'loading' | 'ready' | 'error';

export function useProviderAnalytics() {
  const [range, setRange] = useState<DateRangeKey>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [viewState, setViewState] = useState<AnalyticsViewState>('loading');

  const load = useCallback(async (selectedRange: DateRangeKey) => {
    setViewState('loading');
    try {
      const result = await fetchAnalytics(selectedRange);
      setData(result);
      setViewState('ready');
    } catch {
      setViewState('error');
    }
  }, []);

  useEffect(() => {
    // Fetch on mount and whenever the selected date range changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(range);
  }, [range, load]);

  return {
    range,
    setRange,
    data,
    viewState,
    isEmpty: viewState === 'ready' && data !== null && data.summary.totalBookings === 0,
    retry: () => load(range),
    simulateEmpty: () => {
      setViewState('ready');
      setData((current) =>
        current
          ? {
              ...current,
              summary: { ...current.summary, totalBookings: 0, completedBookings: 0 },
              trend: current.trend.map((point) => ({ ...point, bookings: 0 })),
              popularServices: [],
              busyHours: current.busyHours.map((point) => ({ ...point, bookings: 0 })),
              statusBreakdown: [],
              ratingDistribution: [],
            }
          : current,
      );
    },
  };
}
