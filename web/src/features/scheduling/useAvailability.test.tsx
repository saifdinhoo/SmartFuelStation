import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useAvailability, useInvalidateAvailability, availabilityQueryKey } from './useAvailability';
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

describe('useAvailability', () => {
  it('does not fetch until both a service and a date are chosen', () => {
    renderHook(() => useAvailability(2, null, null), { wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('does not fetch with a date but no service', () => {
    renderHook(() => useAvailability(2, null, '2026-09-01'), { wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('fetches with the providerId, serviceId and date once both are chosen', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          providerId: 2,
          serviceId: 5,
          date: '2026-09-01',
          status: 'OPEN',
          openingTime: '09:00',
          closingTime: '18:00',
          serviceDurationMinutes: 60,
          slots: [{ startTime: '09:00', endTime: '10:00', status: 'AVAILABLE' }],
        },
      },
    });

    const { result } = renderHook(() => useAvailability(2, 5, '2026-09-01'), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/providers/2/availability', {
      params: { serviceId: 5, date: '2026-09-01' },
    });
    expect(result.current.availability?.status).toBe('OPEN');
    expect(result.current.availability?.slots).toHaveLength(1);
  });
});

describe('useInvalidateAvailability', () => {
  it('invalidates every cached query for the given provider regardless of service/date', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(availabilityQueryKey(2, 5, '2026-09-01'), { status: 'OPEN' });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    function TestWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useInvalidateAvailability(), { wrapper: TestWrapper });
    result.current(2);

    expect(spy).toHaveBeenCalledWith({ queryKey: ['availability', 2] });
  });
});
