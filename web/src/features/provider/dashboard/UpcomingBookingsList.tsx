import { CalendarCheck } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import type { UpcomingBooking } from './types';

export function UpcomingBookingsList({ bookings }: { bookings: UpcomingBooking[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-primary" />
        <h2 className="text-heading-3">Upcoming Bookings</h2>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <EmptyState
            title="No upcoming bookings"
            description="New bookings from customers will show up here."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="text-foreground">{booking.customerName}</p>
                  <p className="text-caption">{booking.service}</p>
                </div>
                <span className="text-caption">{booking.time}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
