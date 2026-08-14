export type QueueEntryStatus = 'waiting' | 'in-service';

export interface QueueEntry {
  id: string;
  customerName: string;
  service: string;
  status: QueueEntryStatus;
  waitMinutes?: number;
}

// Raw shape exactly as the backend returns it (see queue.service.js) —
// never used directly by components, always mapped first (see
// queueSelectors.ts).
export type RawQueueStatus = 'WAITING' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED';

export interface RawQueueEntry {
  id: number;
  providerId: number;
  providerServiceId: number;
  bookingId: number | null;
  customerId: number | null;
  customerName: string;
  status: RawQueueStatus;
  position: number;
  joinedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  providerService: { id: number; name: string; durationMinutes: number };
  estimatedWaitMinutes: number | null;
}
