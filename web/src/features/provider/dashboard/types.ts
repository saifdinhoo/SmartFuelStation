export interface UpcomingBooking {
  id: string;
  customerName: string;
  service: string;
  time: string;
}

export interface ServiceAvailability {
  id: string;
  name: string;
  available: boolean;
}

export interface WeeklyBookingPoint {
  day: string;
  bookings: number;
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}

// Queue length/wait time/entries are NOT part of this mock model — they
// come from the real Queue backend (see queue/useProviderQueue.ts) so
// there is exactly one queue implementation, not a mock one here plus a
// real one there.
export interface ProviderOverviewData {
  businessName: string;
  isOpen: boolean;
  todayBookings: number;
  completedServices: number;
  averageRating: number;
  revenueThisMonth: number;
  upcomingBookings: UpcomingBooking[];
  services: ServiceAvailability[];
  weeklyBookings: WeeklyBookingPoint[];
  reviews: Review[];
}
