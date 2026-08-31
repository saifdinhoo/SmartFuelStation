import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import {
  useAdminFinanceSummary,
  useAdminFinanceTransactions,
  useAdminProviderFinance,
  useProviderCommission,
  useSettleTransaction,
  useUpdateProviderCommission,
} from './useAdminFinance';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('@/app/providers/ToastProvider', () => ({
  useToast: () => ({ showToast }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAdminFinanceSummary', () => {
  it('fetches /admin/finance/summary with the requested range', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: {} } });
    const { result } = renderHook(() => useAdminFinanceSummary('90d'), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/admin/finance/summary', { params: { range: '90d' } });
  });
});

describe('useAdminFinanceTransactions', () => {
  it('forwards providerId and status filters', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    const { result } = renderHook(() => useAdminFinanceTransactions({ providerId: 2, status: 'PENDING' }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/admin/finance/transactions', {
      params: { providerId: 2, status: 'PENDING' },
    });
  });
});

describe('useAdminProviderFinance', () => {
  it('does not fetch until a providerId is given', () => {
    renderHook(() => useAdminProviderFinance(undefined, '30d'), { wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('fetches /admin/finance/providers/:id once a providerId is given', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: {} } });
    const { result } = renderHook(() => useAdminProviderFinance(2, '30d'), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/admin/finance/providers/2', { params: { range: '30d' } });
  });
});

describe('useSettleTransaction', () => {
  it('PATCHes the settlement endpoint and shows a success toast', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, data: { id: 9, providerId: 2, settlementStatus: 'SETTLED' } },
    });
    const { result } = renderHook(() => useSettleTransaction(), { wrapper });

    await result.current.settle(9);

    expect(apiClient.patch).toHaveBeenCalledWith('/admin/finance/transactions/9/settlement');
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('settled'), variant: 'success' }),
    );
  });

  it('shows a destructive toast when settlement fails (e.g. already settled)', async () => {
    vi.mocked(apiClient.patch).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'This transaction has already been settled' } },
    });
    const { result } = renderHook(() => useSettleTransaction(), { wrapper });

    await expect(result.current.settle(9)).rejects.toBeTruthy();
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});

describe('useProviderCommission (admin)', () => {
  it('does not fetch until a providerId is given', () => {
    renderHook(() => useProviderCommission(undefined), { wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('fetches /admin/providers/:id/commission', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { providerId: 2, commissionRate: 10 } },
    });
    const { result } = renderHook(() => useProviderCommission(2), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/admin/providers/2/commission');
  });
});

describe('useUpdateProviderCommission', () => {
  it('PUTs the new rate and shows a success toast', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { success: true, data: { providerId: 2, commissionRate: 15 } },
    });
    const { result } = renderHook(() => useUpdateProviderCommission(), { wrapper });

    await result.current.save(2, 15);

    expect(apiClient.put).toHaveBeenCalledWith('/admin/providers/2/commission', { commissionRate: 15 });
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
  });

  it('shows a destructive toast for an out-of-range rate rejected by the server', async () => {
    vi.mocked(apiClient.put).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'commissionRate must be between 0 and 100' } },
    });
    const { result } = renderHook(() => useUpdateProviderCommission(), { wrapper });

    await expect(result.current.save(2, 150)).rejects.toBeTruthy();
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
