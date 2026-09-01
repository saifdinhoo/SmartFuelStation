import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useNearbyProviders } from './useNearbyProviders';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));

function wrapperWithPath(initialPath: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
});

describe('useNearbyProviders — deep-linked category filter', () => {
  it('defaults categoryId to "all" with no query param', () => {
    const { result } = renderHook(() => useNearbyProviders(), {
      wrapper: wrapperWithPath('/customer/search'),
    });
    expect(result.current.categoryId).toBe('all');
  });

  it('initializes categoryId from a real "?categoryId=" query param (e.g. from the AI assistant)', () => {
    const { result } = renderHook(() => useNearbyProviders(), {
      wrapper: wrapperWithPath('/customer/search?categoryId=5'),
    });
    expect(result.current.categoryId).toBe(5);
  });

  it('falls back to "all" for a non-numeric categoryId query param', () => {
    const { result } = renderHook(() => useNearbyProviders(), {
      wrapper: wrapperWithPath('/customer/search?categoryId=not-a-number'),
    });
    expect(result.current.categoryId).toBe('all');
  });
});
