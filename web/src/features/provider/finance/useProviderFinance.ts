import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  fetchOwnCommission,
  fetchOwnFinanceSummary,
  fetchOwnFinanceTransactions,
} from '@/features/finance/financeApi';
import type { FinanceRange } from '@/features/finance/types';

export function useOwnFinanceSummary(range: FinanceRange) {
  const query = useQuery({
    queryKey: ['finance', 'me', 'summary', range],
    queryFn: () => fetchOwnFinanceSummary(range),
  });

  return {
    summary: query.data,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load your finance summary')
      : null,
    reload: () => query.refetch(),
  };
}

export function useOwnFinanceTransactions() {
  const query = useQuery({
    queryKey: ['finance', 'me', 'transactions'],
    queryFn: fetchOwnFinanceTransactions,
  });

  return {
    transactions: query.data,
    isPending: query.isPending,
    isError: query.isError,
  };
}

// Read-only. There is deliberately no mutation hook in this file — a
// provider can never write its own commission rate, only ADMIN can (see
// useAdminFinance.ts's useUpdateProviderCommission).
export function useOwnCommission() {
  const query = useQuery({ queryKey: ['finance', 'me', 'commission'], queryFn: fetchOwnCommission });

  return {
    commission: query.data,
    isPending: query.isPending,
    isError: query.isError,
  };
}
