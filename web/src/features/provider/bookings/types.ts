import type { Booking, BookingStatus } from '@/features/customer/bookings/types';

export type { Booking, BookingStatus };

// The action a provider can take on a booking in a given state.
//
// Which *endpoint* each one uses matters, and is not interchangeable:
//   - 'booking'      -> PATCH /bookings/:id            (booking-only edge)
//   - 'queue-add'    -> POST  /queue { bookingId }     (creates the entry AND
//                                                       moves booking to IN_QUEUE)
//   - 'queue-status' -> PATCH /queue/:id               (moves the entry AND
//                                                       syncs the booking)
//   - 'queue-remove' -> DELETE /queue/:id              (drops the entry AND
//                                                       cancels the booking)
//
// Everything from ARRIVED onward deliberately goes through the Queue
// endpoints rather than PATCH /bookings/:id. The booking-side edges
// (ARRIVED->IN_QUEUE, IN_QUEUE->IN_SERVICE, ...) do exist in the backend
// transition table, but driving them directly would advance the Booking
// while leaving its linked QueueEntry behind — queue.service.js only keeps
// the two in step when the *queue* side is the one being mutated.
export type ProviderBookingAction =
  | { kind: 'booking'; to: Extract<BookingStatus, 'CONFIRMED' | 'REJECTED' | 'ARRIVED' | 'CANCELLED'> }
  | { kind: 'queue-add' }
  | { kind: 'queue-status'; to: 'IN_SERVICE' | 'COMPLETED' }
  | { kind: 'queue-remove' };

export interface ProviderBookingActionSpec {
  id: string;
  label: string;
  action: ProviderBookingAction;
  variant: 'primary' | 'secondary' | 'destructive';
  /** Destructive/irreversible steps get a ConfirmDialog before firing. */
  confirm?: { title: string; description: string; confirmLabel: string; danger: boolean };
}

// Mirrors the backend state machine (shared/bookingTransitions.js +
// QUEUE_TRANSITIONS in queue.service.js) for the PROVIDER role only. The
// server re-validates every one of these — this table exists so the UI
// never offers a button the backend would reject, not as the authority.
export function getProviderActions(status: BookingStatus): ProviderBookingActionSpec[] {
  switch (status) {
    case 'PENDING':
      return [
        { id: 'confirm', label: 'Confirm booking', action: { kind: 'booking', to: 'CONFIRMED' }, variant: 'primary' },
        {
          id: 'reject',
          label: 'Reject',
          action: { kind: 'booking', to: 'REJECTED' },
          variant: 'destructive',
          confirm: {
            title: 'Reject this booking?',
            description:
              'The customer will be notified that their request was declined. This cannot be undone.',
            confirmLabel: 'Reject booking',
            danger: true,
          },
        },
      ];
    case 'CONFIRMED':
      return [
        {
          id: 'arrive',
          label: 'Mark as arrived',
          action: { kind: 'booking', to: 'ARRIVED' },
          variant: 'primary',
        },
        {
          id: 'cancel',
          label: 'Cancel',
          action: { kind: 'booking', to: 'CANCELLED' },
          variant: 'destructive',
          confirm: {
            title: 'Cancel this booking?',
            description: 'The customer will be notified. This cannot be undone.',
            confirmLabel: 'Cancel booking',
            danger: true,
          },
        },
      ];
    case 'ARRIVED':
      return [
        { id: 'queue', label: 'Add to queue', action: { kind: 'queue-add' }, variant: 'primary' },
        {
          id: 'cancel',
          label: 'Cancel',
          action: { kind: 'booking', to: 'CANCELLED' },
          variant: 'destructive',
          confirm: {
            title: 'Cancel this booking?',
            description: 'The customer has already arrived. This cannot be undone.',
            confirmLabel: 'Cancel booking',
            danger: true,
          },
        },
      ];
    case 'IN_QUEUE':
      return [
        {
          id: 'start',
          label: 'Start service',
          action: { kind: 'queue-status', to: 'IN_SERVICE' },
          variant: 'primary',
        },
        {
          id: 'remove',
          label: 'Remove from queue',
          action: { kind: 'queue-remove' },
          variant: 'destructive',
          confirm: {
            title: 'Remove from queue?',
            description:
              'This drops the customer out of the line and cancels their booking. This cannot be undone.',
            confirmLabel: 'Remove',
            danger: true,
          },
        },
      ];
    case 'IN_SERVICE':
      return [
        {
          id: 'complete',
          label: 'Complete service',
          action: { kind: 'queue-status', to: 'COMPLETED' },
          variant: 'primary',
          confirm: {
            title: 'Complete service?',
            description: "This marks the service finished and closes the customer's booking.",
            confirmLabel: 'Complete',
            danger: false,
          },
        },
      ];
    default:
      // COMPLETED / CANCELLED / REJECTED are terminal — nothing to offer.
      return [];
  }
}

export const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'ARRIVED', label: 'Arrived' },
  { value: 'IN_QUEUE', label: 'In queue' },
  { value: 'IN_SERVICE', label: 'In service' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Rejected' },
];

export const DATE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Any date' },
  { value: 'TODAY', label: 'Today' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'PAST', label: 'Past' },
];
