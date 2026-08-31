import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useOwnFuel, useProviderFuel, useProviderFuelHistory, useInvalidateFuel } from './useFuel';
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

describe('useOwnFuel', () => {
  it('fetches the provider\'s own inventory from /providers/me/fuel', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    const { result } = renderHook(() => useOwnFuel(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/providers/me/fuel');
  });

  it('surfaces a friendly error message on failure', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useOwnFuel(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorMessage).toBeTruthy();
  });
});

describe('useProviderFuel', () => {
  it('does not fetch until a providerId is given', () => {
    renderHook(() => useProviderFuel(undefined), { wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('fetches /providers/:id/fuel once a providerId is given', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    const { result } = renderHook(() => useProviderFuel(2), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/providers/2/fuel');
  });
});

describe('useProviderFuelHistory', () => {
  it('does not fetch without both a providerId and a fuelType', () => {
    renderHook(() => useProviderFuelHistory(2, undefined, '7d'), { wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('fetches with fuelType and range as query params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    const { result } = renderHook(() => useProviderFuelHistory(2, 'DIESEL', '30d'), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/providers/2/fuel/history', {
      params: { fuelType: 'DIESEL', range: '30d' },
    });
  });
});

describe('useInvalidateFuel', () => {
  it('invalidates both the fuel and fuelHistory caches for the given provider', () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    function TestWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useInvalidateFuel(), { wrapper: TestWrapper });
    result.current(2);

    expect(spy).toHaveBeenCalledWith({ queryKey: ['fuel', 2] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['fuelHistory', 2] });
  });
});
