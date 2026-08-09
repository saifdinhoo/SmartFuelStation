export type QueueEntryStatus = 'waiting' | 'in-service';

export interface QueueEntry {
  id: string;
  customerName: string;
  service: string;
  status: QueueEntryStatus;
}

export const AVG_MINUTES_PER_SERVICE = 15;
