import type { BookingStatus } from '@/features/customer/bookings/types';

export type QueueEntryStatus = 'WAITING' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED';

// Shape of a single row from GET /queue when the caller is a CUSTOMER —
// the backend already scopes this to the caller's own entry only (see
// queue.service.js's listOwnQueueEntries), so no other customer's name,
// id, or booking ever appears here to begin with.
export interface MyQueueEntry {
  id: number;
  providerId: number;
  providerServiceId: number;
  bookingId: number | null;
  status: QueueEntryStatus;
  estimatedWaitMinutes: number | null;
  customersAhead: number | null;
  joinedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  provider: { id: number; businessName: string };
  providerService: { id: number; name: string; durationMinutes: number };
  booking: { id: number; status: BookingStatus; scheduledAt: string } | null;
}

// GET /queue/summary/:providerId — aggregate-only, safe for any browsing
// customer to see (no entry-level detail).
export interface QueueSummary {
  providerId: number;
  queueLength: number;
  estimatedWaitMinutes: number;
}
