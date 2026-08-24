import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { updateBookingStatus } from '@/features/customer/bookings/bookingsApi';
import {
  fetchQueue,
  createFromBooking,
  updateQueueStatus,
  removeQueueEntry,
} from '@/features/provider/queue/queueApi';
import type { ProviderBookingAction } from './types';

export const BOOKINGS_QUERY_KEY = ['bookings'];
export const QUEUE_QUERY_KEY = ['queue'];

// Maps bookingId -> queue entry id for this provider's queue. The Queue
// endpoints are keyed by *entry* id, but everything on a booking screen is
// keyed by booking id, so the two have to be bridged somewhere. Reusing the
// same ['queue'] key the Queue page already owns means this shares one
// cache entry with it rather than opening a second, independently-stale
// reading of the same data — and it is the exact cache SocketProvider
// keeps fresh, so queue pushes land here for free.
export function useProviderQueueIndex() {
  const query = useQuery({ queryKey: QUEUE_QUERY_KEY, queryFn: fetchQueue });

  const byBookingId = new Map<number, { id: number; status: string; position: number }>();
  for (const entry of query.data ?? []) {
    if (entry.bookingId !== null) {
      byBookingId.set(entry.bookingId, {
        id: entry.id,
        status: entry.status,
        position: entry.position,
      });
    }
  }

  return { byBookingId, isPending: query.isPending };
}

interface RunActionInput {
  bookingId: number;
  action: ProviderBookingAction;
  /** Required for the queue-status / queue-remove kinds. */
  queueEntryId?: number;
}

const SUCCESS_MESSAGE: Record<string, string> = {
  CONFIRMED: 'Booking confirmed',
  REJECTED: 'Booking rejected',
  ARRIVED: 'Customer marked as arrived',
  IN_QUEUE: 'Added to the queue',
  CANCELLED: 'Booking cancelled',
  IN_SERVICE: 'Service started',
  COMPLETED: 'Service completed',
};

// One mutation for every provider booking action. Deliberately not split
// per-action: they all invalidate the same two caches and share the same
// error handling, and a single `isPending` is what the UI needs to disable
// the whole action row while any one of them is in flight.
export function useProviderBookingActions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ bookingId, action, queueEntryId }: RunActionInput) => {
      switch (action.kind) {
        case 'booking':
          await updateBookingStatus(bookingId, action.to);
          return action.to;
        case 'queue-add':
          await createFromBooking(bookingId);
          return 'IN_QUEUE';
        case 'queue-status':
          if (queueEntryId === undefined) {
            throw new Error('This booking has no queue entry yet — refresh and try again.');
          }
          await updateQueueStatus(queueEntryId, action.to);
          return action.to;
        case 'queue-remove':
          if (queueEntryId === undefined) {
            throw new Error('This booking has no queue entry yet — refresh and try again.');
          }
          await removeQueueEntry(queueEntryId);
          return 'CANCELLED';
      }
    },
    onSuccess: (resultStatus) => {
      // Both caches, always: a queue mutation syncs the linked booking and
      // a booking mutation can make a booking queue-eligible, so neither
      // one can be assumed unaffected. Invalidate rather than patch by
      // hand — the server response is the only thing that knows the real
      // resulting state of both records.
      queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
      showToast({
        title: SUCCESS_MESSAGE[resultStatus] ?? 'Booking updated',
        variant: 'success',
      });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not update this booking, please try again'),
        variant: 'destructive',
      });
    },
  });

  return {
    runAction: (input: RunActionInput) => mutation.mutateAsync(input),
    isRunning: mutation.isPending,
  };
}
