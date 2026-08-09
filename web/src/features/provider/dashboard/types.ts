export interface UpcomingBooking {
  id: string;
  customerName: string;
  service: string;
  time: string;
}

export interface QueueEntry {
  position: number;
  customerName: string;
  service: string;
  waitMinutes: number;
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

export interface ProviderOverviewData {
  businessName: string;
  isOpen: boolean;
  queueLength: number;
  estimatedWaitMinutes: number;
  todayBookings: number;
  completedServices: number;
  averageRating: number;
  revenueThisMonth: number;
  upcomingBookings: UpcomingBooking[];
  queueEntries: QueueEntry[];
  services: ServiceAvailability[];
  weeklyBookings: WeeklyBookingPoint[];
  reviews: Review[];
}
