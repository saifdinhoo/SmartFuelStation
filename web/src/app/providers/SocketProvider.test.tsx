import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SocketProvider } from './SocketProvider';

// vi.mock factories are hoisted above this file's other top-level code, so
// the fake socket has to be created inside vi.hoisted() rather than as a
// plain const the factory below closes over.
const { fakeSocket, handlers } = vi.hoisted(() => {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const fakeSocket = {
    connected: false,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb;
      return fakeSocket;
    }),
    off: vi.fn(() => fakeSocket),
  };
  return { fakeSocket, handlers };
});

vi.mock('@/services/socketClient', () => ({
  socket: fakeSocket,
  connectSocketWithToken: vi.fn(),
  disconnectSocket: vi.fn(),
}));

vi.mock('@/services/tokenStorage', () => ({
  tokenStorage: { get: vi.fn(() => 'fake-token') },
}));

let mockIsAuthenticated = true;
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated, user: { id: 1 } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAuthenticated = true;
});

describe('SocketProvider — notification:new integration', () => {
  it('prepends an incoming notification and bumps the unread count in the query cache', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['notifications'], [{ id: 1, title: 'Old' }]);
    queryClient.setQueryData(['notifications', 'unread-count'], 2);

    render(
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <div>child</div>
        </SocketProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(handlers['notification:new']).toBeTypeOf('function'));

    handlers['notification:new']({ id: 2, title: 'New' });

    expect(queryClient.getQueryData(['notifications'])).toEqual([
      { id: 2, title: 'New' },
      { id: 1, title: 'Old' },
    ]);
    expect(queryClient.getQueryData(['notifications', 'unread-count'])).toBe(3);
  });

  it('invalidates notifications on (re)connect so REST resyncs anything missed while offline', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <div>child</div>
        </SocketProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(handlers['connect']).toBeTypeOf('function'));
    handlers['connect']();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications', 'unread-count'] });
  });

  it('invalidates availability on (re)connect too', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <div>child</div>
        </SocketProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(handlers['connect']).toBeTypeOf('function'));
    handlers['connect']();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['availability'] });
  });

  it('invalidates only the affected provider\'s availability on provider:availability_changed', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['availability', 2, 5, '2026-09-01'], { status: 'OPEN', slots: [] });
    queryClient.setQueryData(['availability', 9, 1, '2026-09-01'], { status: 'OPEN', slots: [] });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <div>child</div>
        </SocketProvider>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(handlers['provider:availability_changed']).toBeTypeOf('function'),
    );
    handlers['provider:availability_changed']({ providerId: 2 });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['availability', 2] });
  });

  it('clears cached notifications when the user is not authenticated (logout)', () => {
    mockIsAuthenticated = false;
    const queryClient = new QueryClient();
    queryClient.setQueryData(['notifications'], [{ id: 1 }]);
    queryClient.setQueryData(['notifications', 'unread-count'], 5);

    render(
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <div>child</div>
        </SocketProvider>
      </QueryClientProvider>,
    );

    expect(queryClient.getQueryData(['notifications'])).toBeUndefined();
    expect(queryClient.getQueryData(['notifications', 'unread-count'])).toBeUndefined();
  });
});
