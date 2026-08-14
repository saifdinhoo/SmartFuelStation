import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchProviders, approveProvider } from './providersApi';
import type { AdminProvider } from './types';

export type ProviderApprovalsViewState = 'loading' | 'error' | 'ready';

export function useProviderApprovals() {
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [viewState, setViewState] = useState<ProviderApprovalsViewState>('loading');
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setViewState('loading');
    try {
      const result = await fetchProviders();
      setProviders(result);
      setViewState('ready');
    } catch {
      setViewState('error');
    }
  }, []);

  useEffect(() => {
    // Real backend fetch on mount — the canonical effect use case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const pending = useMemo(() => providers.filter((p) => !p.isApproved), [providers]);

  async function approve(id: number) {
    const target = providers.find((p) => p.id === id);
    setProviders((current) => current.map((p) => (p.id === id ? { ...p, isApproved: true } : p))); // optimistic
    try {
      const updated = await approveProvider(id);
      setProviders((current) => current.map((p) => (p.id === id ? updated : p)));
      showToast({ title: `${target?.businessName ?? 'Provider'} approved`, variant: 'success' });
    } catch (err) {
      setProviders((current) =>
        current.map((p) => (p.id === id ? { ...p, isApproved: false } : p)),
      ); // rollback
      showToast({
        title: getErrorMessage(err, 'Could not approve provider, please try again'),
        variant: 'destructive',
      });
    }
  }

  return {
    viewState,
    totalProviders: providers.length,
    pending,
    approve,
    reload: load,
  };
}
