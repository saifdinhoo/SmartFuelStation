import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useNotifications } from './useNotifications';
import { useUnreadCount } from './useUnreadCount';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useNotifications', () => {
  it('exposes the fetched list, as returned by the API', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: [{ id: 1, title: 'Hello' }] },
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/notifications');
    expect(result.current.notifications).toEqual([{ id: 1, title: 'Hello' }]);
  });

  it('surfaces a friendly error message on failure', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorMessage).toBeTruthy();
  });
});

describe('useUnreadCount', () => {
  it('defaults to 0 while pending and reflects the API count once loaded', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { count: 4 } });

    const { result } = renderHook(() => useUnreadCount(), { wrapper });

    expect(result.current.count).toBe(0);
    await waitFor(() => expect(result.current.count).toBe(4));
    expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count');
  });
});
