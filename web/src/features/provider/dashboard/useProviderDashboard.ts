import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/app/providers/ToastProvider';
import {
  fetchProviderOverview,
  updateOpenStatus,
  updateQueueLength,
  MINUTES_PER_QUEUE_SLOT,
} from './mockData';
import type { ProviderOverviewData } from './types';

export type DashboardViewState = 'loading' | 'error' | 'ready';

export function useProviderDashboard() {
  const [data, setData] = useState<ProviderOverviewData | null>(null);
  const [viewState, setViewState] = useState<DashboardViewState>('loading');
  const { showToast } = useToast();

  const load = useCallback(async (mode: 'ready' | 'empty' | 'error' = 'ready') => {
    setViewState('loading');
    try {
      const result = await fetchProviderOverview(mode);
      setData(result);
      setViewState('ready');
    } catch {
      setViewState('error');
    }
  }, []);

  useEffect(() => {
    // Initial data fetch on mount — the canonical effect use case. The
    // synchronous setViewState('loading') at the top of load() is a no-op
    // here anyway since that's already the initial state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function toggleOpenStatus() {
    if (!data) return;
    const previous = data.isOpen;
    const next = !previous;
    setData({ ...data, isOpen: next }); // optimistic

    try {
      await updateOpenStatus(next);
      showToast({ title: next ? "You're now open" : "You're now closed", variant: 'success' });
    } catch {
      setData((current) => (current ? { ...current, isOpen: previous } : current)); // rollback
      showToast({ title: 'Could not update status, please try again', variant: 'destructive' });
    }
  }

  async function adjustQueue(delta: number) {
    if (!data) return;
    const previousLength = data.queueLength;
    const nextLength = Math.max(0, previousLength + delta);
    const previousWait = data.estimatedWaitMinutes;
    const nextWait = nextLength * MINUTES_PER_QUEUE_SLOT;

    setData({ ...data, queueLength: nextLength, estimatedWaitMinutes: nextWait }); // optimistic

    try {
      await updateQueueLength(nextLength);
    } catch {
      setData((current) =>
        current
          ? { ...current, queueLength: previousLength, estimatedWaitMinutes: previousWait }
          : current,
      ); // rollback
      showToast({ title: 'Could not update queue, please try again', variant: 'destructive' });
    }
  }

  return {
    data,
    viewState,
    toggleOpenStatus,
    adjustQueue,
    reload: () => load('ready'),
    simulateLoading: () => load('ready'),
    simulateEmpty: () => load('empty'),
    simulateError: () => load('error'),
  };
}
