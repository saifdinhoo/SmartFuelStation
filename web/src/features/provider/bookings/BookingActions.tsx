import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useProviderBookingActions, useProviderQueueIndex } from './useProviderBookingActions';
import { getProviderActions, type Booking, type ProviderBookingActionSpec } from './types';

interface BookingActionsProps {
  booking: Booking;
  size?: 'sm' | 'md';
}

// The provider's transition controls for one booking. Used by both the
// list rows and the details page so the two can never drift on which
// action is legal in which state.
export function BookingActions({ booking, size = 'md' }: BookingActionsProps) {
  const { runAction, isRunning } = useProviderBookingActions();
  const { byBookingId } = useProviderQueueIndex();
  const [pending, setPending] = useState<ProviderBookingActionSpec | null>(null);

  const specs = getProviderActions(booking.status);
  if (specs.length === 0) return null;

  const queueEntry = byBookingId.get(booking.id);

  async function fire(spec: ProviderBookingActionSpec) {
    await runAction({
      bookingId: booking.id,
      action: spec.action,
      queueEntryId: queueEntry?.id,
    });
  }

  async function handleConfirm() {
    if (!pending) return;
    try {
      await fire(pending);
    } finally {
      // Closed regardless of outcome — the error surfaces as a toast, and
      // leaving the dialog open would invite a blind double-submit.
      setPending(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {specs.map((spec) => {
          // Queue-keyed actions need the entry id from GET /queue. If the
          // cache hasn't produced it yet, the button stays disabled rather
          // than firing a request that would fail server-side.
          const needsEntry =
            spec.action.kind === 'queue-status' || spec.action.kind === 'queue-remove';
          const blocked = needsEntry && queueEntry === undefined;

          return (
            <Button
              key={spec.id}
              variant={spec.variant}
              className={size === 'sm' ? 'h-8 px-3 text-xs' : undefined}
              disabled={isRunning || blocked}
              title={blocked ? 'Waiting for queue data…' : undefined}
              onClick={() => (spec.confirm ? setPending(spec) : fire(spec))}
            >
              {spec.label}
            </Button>
          );
        })}
      </div>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        title={pending?.confirm?.title ?? ''}
        description={pending?.confirm?.description ?? ''}
        confirmLabel={pending?.confirm?.confirmLabel}
        danger={pending?.confirm?.danger}
        isLoading={isRunning}
      />
    </>
  );
}
