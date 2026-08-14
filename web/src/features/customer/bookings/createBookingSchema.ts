import { z } from 'zod';

export const createBookingSchema = z.object({
  providerServiceId: z.string().min(1, 'Select a service'),
  scheduledAt: z.string().min(1, 'Select a date and time'),
  notes: z.string().max(500).optional(),
});

export type CreateBookingFormValues = z.infer<typeof createBookingSchema>;
