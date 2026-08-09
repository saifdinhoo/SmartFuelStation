import { useCallback, useEffect, useState } from 'react';
import { fetchAdminOverview } from './mockAdminOverviewApi';
import type { AdminOverviewData } from './types';

export type AdminOverviewViewState = 'loading' | 'error' | 'ready';

export function useAdminOverview() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [viewState, setViewState] = useState<AdminOverviewViewState>('loading');

  const load = useCallback(async (mode: 'ready' | 'empty' | 'error' = 'ready') => {
    setViewState('loading');
    try {
      const result = await fetchAdminOverview(mode);
      setData(result);
      setViewState('ready');
    } catch {
      setViewState('error');
    }
  }, []);

  useEffect(() => {
    // Initial data fetch on mount — the canonical effect use case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return {
    data,
    viewState,
    reload: () => load('ready'),
    simulateLoading: () => load('ready'),
    simulateEmpty: () => load('empty'),
    simulateError: () => load('error'),
  };
}
