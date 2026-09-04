import { z } from 'zod';

// Mirrors bookingPolicy.service.js's validate() bounds exactly — a UX
// convenience, never the authority; the backend re-validates independently.
export const bookingPolicyFormSchema = z.object({
  minAdvanceMinutes: z
    .number({ message: 'Minimum advance time is required' })
    .int('Must be a whole number of minutes')
    .min(0, 'Must be 0 or more')
    .max(10_080, 'Must be at most 10080 minutes (one week)'),
  maxAdvanceDays: z
    .number({ message: 'Maximum days in advance is required' })
    .int('Must be a whole number of days')
    .min(1, 'Must be at least 1 day')
    .max(365, 'Must be at most 365 days'),
  allowSameDayBooking: z.boolean(),
});

export type BookingPolicyFormValues = z.infer<typeof bookingPolicyFormSchema>;
