import type { BookingStatus } from '@/features/customer/bookings/types';
import { useMyQueueEntries } from './useMyQueueEntries';
import { deriveQueueDisplay } from './customerQueueSelectors';

interface CustomerQueueBadgeProps {
  bookingId: number;
  bookingStatus: BookingStatus;
}

// Compact one-line queue status for a booking card in a list. Renders
// nothing while loading, on error, or when there's simply nothing to say
// yet (booking hasn't reached the front desk) — the full picture lives on
// CustomerQueueStatusCard (booking details page).
export function CustomerQueueBadge({ bookingId, bookingStatus }: CustomerQueueBadgeProps) {
  const { entries, isPending, isError } = useMyQueueEntries();
  if (isPending || isError) return null;

  const entry = entries.find((e) => e.bookingId === bookingId);
  const display = deriveQueueDisplay(entry, bookingStatus);
  if (!display) return null;

  return <p className="text-body-sm text-foreground">{display.headline}</p>;
}
