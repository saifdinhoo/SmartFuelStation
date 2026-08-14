import type { BookingStatus } from '@/features/customer/bookings/types';
import type { MyQueueEntry } from './types';

export type QueueDisplayTone = 'waiting' | 'active' | 'done' | 'neutral';

export interface QueueDisplayInfo {
  headline: string;
  detail: string | null;
  nextAction: string;
  tone: QueueDisplayTone;
}

// Turns (queue entry | absent, booking status) into the one message the
// customer needs to see. Shared between the full status card and the
// compact booking-card summary so the two never disagree about what a
// given state means.
export function deriveQueueDisplay(
  entry: MyQueueEntry | undefined,
  bookingStatus: BookingStatus,
): QueueDisplayInfo | null {
  if (!entry) {
    // Not in the queue yet. Only worth a message once the customer has
    // actually arrived — before that, queueing isn't relevant yet.
    if (bookingStatus === 'ARRIVED') {
      return {
        headline: 'Waiting to be added to the queue',
        detail: 'Let the front desk know you have arrived.',
        nextAction: 'No action needed — the provider will add you shortly.',
        tone: 'neutral',
      };
    }
    return null;
  }

  if (entry.status === 'WAITING') {
    const ahead = entry.customersAhead ?? 0;
    const position = ahead + 1;
    const wait = entry.estimatedWaitMinutes ?? 0;
    return {
      headline: `You are #${position} in line`,
      detail:
        ahead === 0
          ? `You're next — estimated wait: ${wait} min.`
          : `${ahead} customer${ahead === 1 ? '' : 's'} ahead of you — estimated wait: ${wait} min.`,
      nextAction: 'Please stay nearby — you will be called when it is your turn.',
      tone: 'waiting',
    };
  }

  if (entry.status === 'IN_SERVICE') {
    return {
      headline: "You're being served now",
      detail: null,
      nextAction: 'Enjoy your service!',
      tone: 'active',
    };
  }

  if (entry.status === 'COMPLETED') {
    return {
      headline: 'Service completed',
      detail: null,
      nextAction: 'Thanks for visiting!',
      tone: 'done',
    };
  }

  // CANCELLED
  return {
    headline: 'Removed from the queue',
    detail: null,
    nextAction: 'Contact the provider if you believe this was a mistake.',
    tone: 'neutral',
  };
}
