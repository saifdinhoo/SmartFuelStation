import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  fetchAdminFinanceSummary,
  fetchAdminFinanceTransactions,
  fetchAdminProviderFinance,
  fetchProviderCommission,
  settleFinanceTransaction,
  updateProviderCommission,
} from '@/features/finance/financeApi';
import type { FinanceRange, SettlementStatus } from '@/features/finance/types';

export function useAdminFinanceSummary(range: FinanceRange) {
  const query = useQuery({
    queryKey: ['adminFinance', 'summary', range],
    queryFn: () => fetchAdminFinanceSummary(range),
  });

  return {
    summary: query.data,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load platform finance summary')
      : null,
    reload: () => query.refetch(),
  };
}

export function useAdminFinanceTransactions(params: {
  providerId?: number;
  status?: SettlementStatus | 'ALL';
} = {}) {
  const query = useQuery({
    queryKey: ['adminFinance', 'transactions', params.providerId ?? 'ALL', params.status ?? 'ALL'],
    queryFn: () => fetchAdminFinanceTransactions(params),
  });

  return {
    transactions: query.data,
    isPending: query.isPending,
    isError: query.isError,
  };
}

export function useAdminProviderFinance(providerId: number | undefined, range: FinanceRange) {
  const query = useQuery({
    queryKey: ['adminFinance', 'provider', providerId, range],
    queryFn: () => fetchAdminProviderFinance(providerId as number, range),
    enabled: providerId !== undefined,
  });

  return { data: query.data, isPending: query.isPending, isError: query.isError };
}

export function useSettleTransaction() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (transactionId: number) => settleFinanceTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFinance'] });
      // The provider whose transaction just settled sees it live too.
      queryClient.invalidateQueries({ queryKey: ['finance', 'me'] });
      showToast({ title: 'Transaction marked as settled', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not settle this transaction'),
        variant: 'destructive',
      });
    },
  });

  return {
    settle: (transactionId: number) => mutation.mutateAsync(transactionId),
    isSettling: mutation.isPending,
  };
}

export function useProviderCommission(providerId: number | undefined) {
  const query = useQuery({
    queryKey: ['adminFinance', 'commission', providerId],
    queryFn: () => fetchProviderCommission(providerId as number),
    enabled: providerId !== undefined,
  });

  return { commission: query.data, isPending: query.isPending, isError: query.isError };
}

export function useUpdateProviderCommission() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: ({ providerId, commissionRate }: { providerId: number; commissionRate: number }) =>
      updateProviderCommission(providerId, commissionRate),
    onSuccess: (_data, { providerId }) => {
      queryClient.invalidateQueries({ queryKey: ['adminFinance', 'commission', providerId] });
      queryClient.invalidateQueries({ queryKey: ['adminFinance', 'provider', providerId] });
      // Only ever affects FUTURE completions — see finance.service.js's own
      // doc comment — but the provider's *current rate display* should
      // still update live.
      queryClient.invalidateQueries({ queryKey: ['finance', 'me', 'commission'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'me', 'summary'] });
      showToast({ title: 'Commission rate updated', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not update commission rate'),
        variant: 'destructive',
      });
    },
  });

  return {
    save: (providerId: number, commissionRate: number) =>
      mutation.mutateAsync({ providerId, commissionRate }),
    isSaving: mutation.isPending,
  };
}
