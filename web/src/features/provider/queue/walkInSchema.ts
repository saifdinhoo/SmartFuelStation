import { z } from 'zod';
import { SERVICE_CATEGORIES } from '@/features/provider/services/types';

export const walkInSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  service: z.enum(SERVICE_CATEGORIES, { message: 'Select a service' }),
});

export type WalkInFormValues = z.infer<typeof walkInSchema>;
