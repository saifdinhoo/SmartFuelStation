import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, User, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { BookingStatusBadge } from '@/features/customer/bookings/BookingStatusBadge';
import { BookingActions } from './BookingActions';
import type { Booking } from './types';

export function ProviderBookingRow({ booking }: { booking: Booking }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/provider/bookings/${booking.id}`}
              className="flex items-center gap-1 font-medium text-foreground hover:underline"
            >
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{booking.customer.name}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
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

        <BookingActions booking={booking} size="sm" />
      </CardContent>
    </Card>
  );
}
