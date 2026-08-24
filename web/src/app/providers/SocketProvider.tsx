import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket, connectSocketWithToken, disconnectSocket } from '@/services/socketClient';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuth } from './AuthProvider';

interface SocketContextValue {
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ connected: false });

// Both the provider Queue page's cache (full business queue) and the
// customer's (their own entries only) are plain arrays of objects with a
// numeric `id` — that's all this file needs to know to merge a pushed
// update into whichever shape happens to be cached under ['queue'] for
// the current session's role.
interface QueueEntryLike {
  id: number;
  removed?: boolean;
  [key: string]: unknown;
}

interface ProviderSnapshot {
  providerId: number;
  entries: QueueEntryLike[];
  summary: { providerId: number; queueLength: number; estimatedWaitMinutes: number };
}

interface BookingStatusChangedPayload {
  bookingId: number;
  status: string;
}

// Public availability only — the same fields GET /providers already
// exposes to any authenticated caller. Never carries owner identity,
// address, approval trail, or queue entries.
interface ProviderStatusChangedPayload {
  providerId: number;
  isOpen: boolean;
  estimatedWaitMinutes: number;
  isApproved: boolean;
}

// The shape of one row in the ['providers'] cache that this event can
// touch. Everything else on the row is left exactly as it was.
interface CachedProvider {
  id: number;
  isOpen: boolean;
  estimatedWaitMinutes: number;
  isApproved: boolean;
  [key: string]: unknown;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(socket.connected);

  // Connects on login, disconnects on logout, and re-connects (fresh
  // handshake, not just a mutated auth object) if the logged-in user
  // changes without a full page reload — the socket only reads `auth` at
  // connect time, so a stale token would otherwise linger.
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }
    const token = tokenStorage.get();
    if (token) connectSocketWithToken(token);

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user?.id]);

  // The single place every Queue-related socket event is handled for the
  // whole app — pages never register their own copies of these listeners,
  // they just read whatever query cache this keeps fresh. Registered
  // once per socket instance; the off()-before-on() pattern on every
  // registration guards against a duplicate if this effect ever re-runs
  // (e.g. React StrictMode's double-invoke in development).
  useEffect(() => {
    function onConnect() {
      setConnected(true);
      // First connect or a reconnect after a drop — refetch rather than
      // trust that nothing changed while disconnected.
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      // Provider availability can have changed while disconnected, and
      // missed events are never replayed — REST is what makes a reconnect
      // converge on the real state.
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onProviderUpdated(snapshot: ProviderSnapshot) {
      // Matches GET /queue's shape for a PROVIDER caller exactly — only a
      // provider's socket is ever in a position to receive this (rooms
      // are server-assigned, never client-requested), so it's always
      // safe to place directly into that session's ['queue'] cache.
      queryClient.setQueryData(['queue'], snapshot.entries);
    }

    function onMyUpdate(entry: QueueEntryLike) {
      queryClient.setQueryData<QueueEntryLike[]>(['queue'], (current) => {
        if (!current) return current;
        if (entry.removed) return current.filter((e) => e.id !== entry.id);
        const exists = current.some((e) => e.id === entry.id);
        return exists ? current.map((e) => (e.id === entry.id ? entry : e)) : [...current, entry];
      });
    }

    function onBookingStatusChanged(payload: BookingStatusChangedPayload) {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', String(payload.bookingId)] });
    }

    // Patched in place rather than invalidated: the payload carries every
    // field it touches, so refetching the whole provider list to learn one
    // boolean would be a wasted round trip. Discovery, provider details and
    // the admin list all read this same ['providers'] key, so one write
    // updates every screen showing that business.
    function onProviderStatusChanged(payload: ProviderStatusChangedPayload) {
      queryClient.setQueryData<CachedProvider[]>(['providers'], (current) => {
        if (!current) return current;
        return current.map((provider) =>
          provider.id === payload.providerId
            ? {
                ...provider,
                isOpen: payload.isOpen,
                estimatedWaitMinutes: payload.estimatedWaitMinutes,
                isApproved: payload.isApproved,
              }
            : provider,
        );
      });
    }

    socket.off('connect', onConnect).on('connect', onConnect);
    socket.off('disconnect', onDisconnect).on('disconnect', onDisconnect);
    socket
      .off('queue:provider_updated', onProviderUpdated)
      .on('queue:provider_updated', onProviderUpdated);
    socket.off('queue:my_update', onMyUpdate).on('queue:my_update', onMyUpdate);
    socket
      .off('booking:status_changed', onBookingStatusChanged)
      .on('booking:status_changed', onBookingStatusChanged);
    socket
      .off('provider:status_changed', onProviderStatusChanged)
      .on('provider:status_changed', onProviderStatusChanged);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('queue:provider_updated', onProviderUpdated);
      socket.off('queue:my_update', onMyUpdate);
      socket.off('booking:status_changed', onBookingStatusChanged);
      socket.off('provider:status_changed', onProviderStatusChanged);
    };
  }, [queryClient]);

  return <SocketContext.Provider value={{ connected }}>{children}</SocketContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook pair, intentional
export function useSocketStatus() {
  return useContext(SocketContext);
}
