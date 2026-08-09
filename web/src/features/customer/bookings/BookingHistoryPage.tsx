import { RefreshCw } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Tabs } from '@/components/ui/Tabs';
import { useBookings } from './useBookings';
import { BookingCard } from './BookingCard';
import type { Booking } from './types';

function BookingList({ bookings, emptyMessage }: { bookings: Booking[]; emptyMessage: string }) {
  if (bookings.length === 0) {
    return <EmptyState title="Nothing here yet" description={emptyMessage} />;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}

export function BookingHistoryPage() {
  const { active, history, isPending, isError, errorMessage, reload } = useBookings();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-heading-2">Bookings</h1>
          <p className="text-body-sm text-muted-foreground">
            Track your upcoming and past service appointments.
          </p>
        </div>
        <Button
          variant="ghost"
          className="h-9 w-9 p-0"
          onClick={() => reload()}
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isError && (
        <ErrorState onRetry={reload} description={errorMessage ?? 'Could not load bookings.'} />
      )}

      {!isError && isPending && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      )}

      {!isError && !isPending && (
        <Reveal>
          <Tabs
            tabs={[
              {
                id: 'active',
                label: `Active (${active.length})`,
                content: (
                  <BookingList
                    bookings={active}
                    emptyMessage="No active bookings right now — find a provider and book a service."
                  />
                ),
              },
              {
                id: 'history',
                label: `History (${history.length})`,
                content: (
                  <BookingList
                    bookings={history}
                    emptyMessage="Completed or cancelled bookings will show up here."
                  />
                ),
              },
            ]}
          />
        </Reveal>
      )}
    </div>
  );
}
