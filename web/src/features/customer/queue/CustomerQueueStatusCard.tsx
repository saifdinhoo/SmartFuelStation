import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import type { BookingStatus } from '@/features/customer/bookings/types';
import { useMyQueueEntries } from './useMyQueueEntries';
import { deriveQueueDisplay, type QueueDisplayTone } from './customerQueueSelectors';

interface CustomerQueueStatusCardProps {
  bookingId: number;
  bookingStatus: BookingStatus;
}

const TONE_VARIANT: Record<QueueDisplayTone, 'success' | 'warning' | 'neutral'> = {
  waiting: 'warning',
  active: 'success',
  done: 'neutral',
  neutral: 'neutral',
};

export function CustomerQueueStatusCard({
  bookingId,
  bookingStatus,
}: CustomerQueueStatusCardProps) {
  const { entries, isPending, isError, errorMessage, reload } = useMyQueueEntries();

  if (isPending) {
    return <Skeleton className="h-40 rounded-lg" />;
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-4">
          <ErrorState
            title="Could not load queue status"
            description={errorMessage ?? undefined}
            onRetry={reload}
          />
        </CardContent>
      </Card>
    );
  }

  const entry = entries.find((e) => e.bookingId === bookingId);
  const display = deriveQueueDisplay(entry, bookingStatus);
  if (!display) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-heading-3">Queue status</h2>
        <StatusIndicator
          variant={TONE_VARIANT[display.tone]}
          label={entry ? entry.status.replace('_', ' ') : 'Not queued yet'}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {entry && (
          <>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Provider</span>
              <span className="text-foreground">{entry.provider.businessName}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Service</span>
              <span className="text-foreground">{entry.providerService.name}</span>
            </div>
          </>
        )}
        <p className="font-medium text-foreground">{display.headline}</p>
        {display.detail && <p className="text-body-sm text-muted-foreground">{display.detail}</p>}
        <p className="text-caption mt-1">{display.nextAction}</p>
      </CardContent>
    </Card>
  );
}
