import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useOwnHours, useUpdateOwnHours, useProviderHours } from './useOperatingHours';
import type { OperatingHourEntry } from './types';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
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

describe('useOwnHours', () => {
  it('fetches the provider\'s own hours from /providers/me/hours', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: [{ dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' }] },
    });

    const { result } = renderHook(() => useOwnHours(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/providers/me/hours');
    expect(result.current.hours).toEqual([
      { dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' },
    ]);
  });

  it('surfaces a friendly error message on failure', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useOwnHours(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorMessage).toBeTruthy();
  });
});

describe('useUpdateOwnHours', () => {
  it('PUTs the entries and shows a success toast', async () => {
    const updated: OperatingHourEntry[] = [
      { dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' },
    ];
    vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true, data: updated } });

    const { result } = renderHook(() => useUpdateOwnHours(), { wrapper });
    await result.current.save(updated);

    expect(apiClient.put).toHaveBeenCalledWith('/providers/me/hours', updated);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
  });

  it('shows a destructive toast with the backend message on failure (e.g. a 400 validation error)', async () => {
    vi.mocked(apiClient.put).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'closeTime must be after openTime' } },
    });

    const { result } = renderHook(() => useUpdateOwnHours(), { wrapper });
    await expect(result.current.save([])).rejects.toBeTruthy();

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });
});

describe('useProviderHours (public read)', () => {
  it('does not fetch until a providerId is given', () => {
    renderHook(() => useProviderHours(undefined), { wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('fetches /providers/:id/hours once a providerId is given', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });

    const { result } = renderHook(() => useProviderHours(2), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/providers/2/hours');
  });
});
