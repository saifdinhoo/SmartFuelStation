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

    socket.off('connect', onConnect).on('connect', onConnect);
    socket.off('disconnect', onDisconnect).on('disconnect', onDisconnect);
    socket
      .off('queue:provider_updated', onProviderUpdated)
      .on('queue:provider_updated', onProviderUpdated);
    socket.off('queue:my_update', onMyUpdate).on('queue:my_update', onMyUpdate);
    socket
      .off('booking:status_changed', onBookingStatusChanged)
      .on('booking:status_changed', onBookingStatusChanged);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('queue:provider_updated', onProviderUpdated);
      socket.off('queue:my_update', onMyUpdate);
      socket.off('booking:status_changed', onBookingStatusChanged);
    };
  }, [queryClient]);

  return <SocketContext.Provider value={{ connected }}>{children}</SocketContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook pair, intentional
export function useSocketStatus() {
  return useContext(SocketContext);
}
