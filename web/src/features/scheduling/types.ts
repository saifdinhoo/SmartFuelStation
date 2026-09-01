// Shared between the provider-side hours editor and the customer-side
// hours display / booking availability screens — both talk to the same
// backend shapes (see backend/src/services/providerHours.service.js and
// availability.service.js), so the types live in one place rather than
// being duplicated per role.

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

// Matches the Prisma enum's own declaration order (and therefore the
// order GET /providers/:id/hours already returns, since the backend
// orders by `dayOfWeek: 'asc'`) — a Monday-first week.
export const DAYS_OF_WEEK: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

export interface OperatingHourEntry {
  dayOfWeek: DayOfWeek;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'PAST';

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  status: SlotStatus;
}

export type AvailabilityStatus = 'OPEN' | 'CLOSED' | 'HOURS_NOT_CONFIGURED';

export interface Availability {
  providerId: number;
  serviceId: number;
  date: string;
  status: AvailabilityStatus;
  openingTime: string | null;
  closingTime: string | null;
  serviceDurationMinutes: number;
  slots: AvailabilitySlot[];
}
