import { z } from 'zod';
import { SERVICE_CATEGORIES } from './types';

export const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  category: z.enum(SERVICE_CATEGORIES, { message: 'Select a category' }),
  price: z.number({ message: 'Price is required' }).positive('Price must be greater than 0'),
  durationMinutes: z
    .number({ message: 'Duration is required' })
    .int('Duration must be a whole number')
    .positive('Duration must be greater than 0'),
  available: z.boolean(),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
