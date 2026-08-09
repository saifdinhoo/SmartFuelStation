import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, Calendar, MapPin, Wrench } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useBookingDetails } from './useBookingDetails';
import { useCancelBooking } from './useCancelBooking';
import { BookingStatusBadge } from './BookingStatusBadge';
import { BookingStatusTimeline } from './BookingStatusTimeline';
import { CUSTOMER_CANCELLABLE_STATUSES } from './types';

export function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { booking, isPending, isError, errorMessage, reload } = useBookingDetails(id ?? '');
  const { cancelBooking, isPending: isCancelling } = useCancelBooking();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function handleConfirmCancel() {
    if (!booking) return;
    await cancelBooking(booking.id);
    setConfirmingCancel(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" onClick={() => navigate('/customer/bookings')}>
        <ArrowLeft className="h-4 w-4" />
        Back to bookings
      </Button>

      {isError && (
        <ErrorState onRetry={reload} description={errorMessage ?? 'Could not load this booking.'} />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      )}

      {!isError && !isPending && !booking && (
        <EmptyState title="Booking not found" description="This booking may no longer exist." />
      )}

      {!isError && !isPending && booking && (
        <Reveal className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-heading-2">{booking.providerService.provider.businessName}</h1>
              <p className="text-body-sm mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5" />
                  {booking.providerService.name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(booking.scheduledAt).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {booking.providerService.provider.address}
                </span>
              </p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Status</h2>
            </CardHeader>
            <CardContent>
              <BookingStatusTimeline status={booking.status} cancelledAt={booking.cancelledAt} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Details</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Service</span>
                <span className="text-foreground">{booking.providerService.name}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Category</span>
                <span className="text-foreground">{booking.providerService.category.name}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-foreground">
                  {booking.providerService.durationMinutes} min
                </span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Price</span>
                <span className="text-foreground">${booking.priceAtBooking}</span>
              </div>
              {booking.notes && (
                <div className="flex justify-between gap-4 pt-1">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="text-right text-foreground">{booking.notes}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {CUSTOMER_CANCELLABLE_STATUSES.includes(booking.status) && (
            <div>
              <Button variant="destructive" onClick={() => setConfirmingCancel(true)}>
                <Ban className="h-4 w-4" />
                Cancel booking
              </Button>
            </div>
          )}
        </Reveal>
      )}

      <ConfirmDialog
        open={confirmingCancel}
        onClose={() => setConfirmingCancel(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel this booking?"
        description="The provider will be notified. This cannot be undone."
        confirmLabel="Cancel booking"
        danger
        isLoading={isCancelling}
      />
    </div>
  );
}
