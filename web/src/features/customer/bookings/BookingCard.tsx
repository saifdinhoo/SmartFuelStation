import { useNavigate } from 'react-router-dom';
import { Calendar, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { CustomerQueueBadge } from '@/features/customer/queue/CustomerQueueBadge';
import { BookingStatusBadge } from './BookingStatusBadge';
import type { Booking } from './types';

export function BookingCard({ booking }: { booking: Booking }) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/40"
      onClick={() => navigate(`/customer/bookings/${booking.id}`)}
    >
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-foreground">
            {booking.providerService.provider.businessName}
          </p>
          <BookingStatusBadge status={booking.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Wrench className="h-3.5 w-3.5" />
            {booking.providerService.name}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(booking.scheduledAt).toLocaleString()}
          </span>
        </div>
        <CustomerQueueBadge bookingId={booking.id} bookingStatus={booking.status} />
        <p className="text-body-sm text-foreground">${booking.priceAtBooking}</p>
      </CardContent>
    </Card>
  );
}
