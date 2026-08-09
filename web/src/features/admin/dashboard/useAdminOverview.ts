import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/app/providers/ToastProvider';
import { fetchAdminOverview, approveProvider, rejectProvider } from './mockAdminOverviewApi';
import type { AdminOverviewData } from './types';

export type AdminOverviewViewState = 'loading' | 'error' | 'ready';

export function useAdminOverview() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [viewState, setViewState] = useState<AdminOverviewViewState>('loading');
  const { showToast } = useToast();

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

  async function approve(id: string) {
    if (!data) return;
    const removed = data.pendingApprovals.find((item) => item.id === id);
    setData({
      ...data,
      pendingApprovals: data.pendingApprovals.filter((item) => item.id !== id),
      summary: {
        ...data.summary,
        pendingApprovals: data.summary.pendingApprovals - 1,
        totalProviders: data.summary.totalProviders + 1,
      },
    }); // optimistic

    try {
      await approveProvider(id);
      showToast({ title: `${removed?.businessName ?? 'Provider'} approved`, variant: 'success' });
    } catch {
      setData((current) =>
        current && removed
          ? {
              ...current,
              pendingApprovals: [...current.pendingApprovals, removed],
              summary: {
                ...current.summary,
                pendingApprovals: current.summary.pendingApprovals + 1,
                totalProviders: current.summary.totalProviders - 1,
              },
            }
          : current,
      ); // rollback
      showToast({ title: 'Could not approve provider, please try again', variant: 'destructive' });
    }
  }

  async function reject(id: string) {
    if (!data) return;
    const removed = data.pendingApprovals.find((item) => item.id === id);
    setData({
      ...data,
      pendingApprovals: data.pendingApprovals.filter((item) => item.id !== id),
      summary: { ...data.summary, pendingApprovals: data.summary.pendingApprovals - 1 },
    }); // optimistic

    try {
      await rejectProvider(id);
      showToast({ title: `${removed?.businessName ?? 'Provider'} rejected`, variant: 'success' });
    } catch {
      setData((current) =>
        current && removed
          ? {
              ...current,
              pendingApprovals: [...current.pendingApprovals, removed],
              summary: {
                ...current.summary,
                pendingApprovals: current.summary.pendingApprovals + 1,
              },
            }
          : current,
      ); // rollback
      showToast({ title: 'Could not reject provider, please try again', variant: 'destructive' });
    }
  }

  return {
    data,
    viewState,
    approve,
    reject,
    reload: () => load('ready'),
    simulateLoading: () => load('ready'),
    simulateEmpty: () => load('empty'),
    simulateError: () => load('error'),
  };
}
