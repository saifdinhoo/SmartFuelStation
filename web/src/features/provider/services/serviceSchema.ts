import { z } from 'zod';

// Number fields are registered with `valueAsNumber`, so the form already
// hands zod real numbers — no z.coerce, which would make the schema's input
// and output types differ and break the resolver's typing.
// categoryId must reference a real ServiceCategory row; the backend 404s on
// an unknown id, so the picker only ever offers ids from /categories.
export const serviceSchema = z.object({
  name: z.string().trim().min(1, 'Service name is required'),
  categoryId: z
    .number({ message: 'Select a category' })
    .int()
    .positive('Select a category'),
  price: z.number({ message: 'Price is required' }).positive('Price must be greater than 0'),
  durationMinutes: z
    .number({ message: 'Duration is required' })
    .int('Duration must be a whole number')
    .positive('Duration must be greater than 0'),
  available: z.boolean(),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
