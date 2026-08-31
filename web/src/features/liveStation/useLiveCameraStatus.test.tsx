import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useLiveCameraStatus } from './useLiveCameraStatus';
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

describe('useLiveCameraStatus', () => {
  it('does not fetch until a providerId is given', () => {
    renderHook(() => useLiveCameraStatus(undefined), { wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('fetches /providers/:id/live-camera once a providerId is given', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { providerId: 2, available: true, status: 'LIVE', playbackUrl: '/api/providers/2/live-camera/stream' } },
    });
    const { result } = renderHook(() => useLiveCameraStatus(2), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/providers/2/live-camera');
    expect(result.current.cameraStatus?.status).toBe('LIVE');
  });

  it('surfaces the real OFFLINE status rather than assuming LIVE', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { providerId: 2, available: true, status: 'OFFLINE', playbackUrl: null } },
    });
    const { result } = renderHook(() => useLiveCameraStatus(2), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.cameraStatus).toEqual({
      providerId: 2,
      available: true,
      status: 'OFFLINE',
      playbackUrl: null,
    });
  });
});
