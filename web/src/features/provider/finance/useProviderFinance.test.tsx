import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useOwnCommission, useOwnFinanceSummary, useOwnFinanceTransactions } from './useProviderFinance';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOwnFinanceSummary', () => {
  it('fetches /providers/me/finance/summary with the requested range — never a providerId', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: {} } });
    const { result } = renderHook(() => useOwnFinanceSummary('7d'), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/providers/me/finance/summary', {
      params: { range: '7d' },
    });
  });

  it('surfaces a friendly error message on failure', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useOwnFinanceSummary('30d'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorMessage).toBeTruthy();
  });
});

describe('useOwnFinanceTransactions', () => {
  it('fetches /providers/me/finance/transactions with no query params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    const { result } = renderHook(() => useOwnFinanceTransactions(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/providers/me/finance/transactions');
  });
});

describe('useOwnCommission', () => {
  it('fetches /providers/me/commission — read only, no write function exists in this module', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { providerId: 2, commissionRate: 10 } },
    });
    const { result } = renderHook(() => useOwnCommission(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/providers/me/commission');
    expect(result.current.commission).toEqual({ providerId: 2, commissionRate: 10 });
  });
});
