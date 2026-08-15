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

// Queue length/wait time/entries are NOT part of this model — they come
// from the real Queue backend (see queue/useProviderQueue.ts) so there is
// exactly one queue implementation. Revenue is likewise absent: nothing in
// the database tracks it as a reportable figure.
export interface ProviderOverviewData {
  businessName: string;
  isOpen: boolean;
  todayBookings: number;
  completedServices: number;
  averageRating: number | null;
  reviewCount: number;
  upcomingBookings: UpcomingBooking[];
  services: ServiceAvailability[];
  weeklyBookings: WeeklyBookingPoint[];
  reviews: Review[];
}
