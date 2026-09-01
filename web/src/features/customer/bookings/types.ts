export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'IN_QUEUE'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

// The normal, in-progress lifecycle a booking walks through when nothing
// goes wrong. CANCELLED/REJECTED are terminal exits handled separately
// wherever this is used (see BookingStatusTimeline).
export const LIFECYCLE_STEPS: BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'ARRIVED',
  'IN_QUEUE',
  'IN_SERVICE',
  'COMPLETED',
];

export const TERMINAL_STATUSES: BookingStatus[] = ['COMPLETED', 'CANCELLED', 'REJECTED'];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  ARRIVED: 'Arrived',
  IN_QUEUE: 'In queue',
  IN_SERVICE: 'In service',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

// A customer can only self-cancel before they've arrived — matches the
// backend's transition table (see booking.service.js).
export const CUSTOMER_CANCELLABLE_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED'];

export interface Booking {
  id: number;
  customerId: number;
  providerServiceId: number;
  status: BookingStatus;
  scheduledAt: string;
  notes: string | null;
  priceAtBooking: string;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: number; name: string; email: string; phone: string | null };
  providerService: {
    id: number;
    name: string;
    price: string;
    durationMinutes: number;
    category: { id: number; name: string };
    provider: { id: number; businessName: string; address: string; userId: number };
  };
  // Existence only — present (non-null) once this booking has been
  // reviewed, so the UI can gate "Leave a review" without a second fetch.
  review: { id: number } | null;
}

export interface CreateBookingInput {
  providerServiceId: number;
  scheduledAt: string;
  notes?: string;
}
