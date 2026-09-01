import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Mail, Phone, User, Wrench } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useBookingDetails } from '@/features/customer/bookings/useBookingDetails';
import { BookingStatusBadge } from '@/features/customer/bookings/BookingStatusBadge';
import { BookingStatusTimeline } from '@/features/customer/bookings/BookingStatusTimeline';
import { SettlementStatusBadge } from '@/features/finance/SettlementStatusBadge';
import { useOwnFinanceTransactions } from '@/features/provider/finance/useProviderFinance';
import { BookingActions } from './BookingActions';
import { useProviderQueueIndex } from './useProviderBookingActions';
import { getProviderActions } from './types';

export function ProviderBookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // GET /bookings/:id is role-scoped server-side (assertBookingAccess), so
  // a provider opening someone else's booking gets a 403 from the API
  // rather than being filtered client-side.
  const { booking, isPending, isError, errorMessage, reload } = useBookingDetails(id ?? '');
  const { byBookingId } = useProviderQueueIndex();
  // Never fetched by booking id directly — there is no such endpoint, and
  // adding one for a single-row lookup here would duplicate what the
  // existing finance transactions list already returns. This same list is
  // already cached for the My Earnings page.
  const { transactions: financeTransactions } = useOwnFinanceTransactions();

  const queueEntry = booking ? byBookingId.get(booking.id) : undefined;
  const hasActions = booking ? getProviderActions(booking.status).length > 0 : false;
  const financeSnapshot =
    booking?.status === 'COMPLETED'
      ? financeTransactions?.find((t) => t.bookingId === booking.id)
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" onClick={() => navigate('/provider/bookings')}>
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
              <h1 className="text-heading-2">{booking.customer.name}</h1>
              <p className="text-body-sm mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5" />
                  {booking.providerService.name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(booking.scheduledAt).toLocaleString()}
                </span>
              </p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          {hasActions && (
            <Card>
              <CardHeader>
                <h2 className="text-heading-3">Next step</h2>
              </CardHeader>
              <CardContent>
                <BookingActions booking={booking} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Status</h2>
            </CardHeader>
            <CardContent>
              <BookingStatusTimeline status={booking.status} cancelledAt={booking.cancelledAt} />
            </CardContent>
          </Card>

          {queueEntry && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <h2 className="text-heading-3">Queue entry</h2>
                <StatusIndicator
                  variant={queueEntry.status === 'IN_SERVICE' ? 'success' : 'warning'}
                  label={queueEntry.status.replace('_', ' ')}
                />
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Position in line</span>
                  <span className="text-foreground">#{queueEntry.position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry ID</span>
                  <span className="text-foreground">{queueEntry.id}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Customer</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  Name
                </span>
                <span className="text-foreground">{booking.customer.name}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </span>
                <span className="text-foreground">{booking.customer.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </span>
                <span className="text-foreground">{booking.customer.phone ?? '—'}</span>
              </div>
            </CardContent>
          </Card>

          {financeSnapshot && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <h2 className="text-heading-3">Earnings</h2>
                <SettlementStatusBadge status={financeSnapshot.settlementStatus} />
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Gross</span>
                  <span className="text-foreground">${financeSnapshot.grossAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Platform fee</span>
                  <span className="text-foreground">
                    {financeSnapshot.commissionRate}% (${financeSnapshot.commissionAmount.toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your net</span>
                  <span className="text-foreground">${financeSnapshot.providerNetAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

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
        </Reveal>
      )}
    </div>
  );
}
