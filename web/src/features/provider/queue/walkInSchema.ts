import { z } from 'zod';

export const walkInSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  providerServiceId: z.string().min(1, 'Select a service'),
});

export type WalkInFormValues = z.infer<typeof walkInSchema>;
