import { z } from 'zod';

// Number fields are registered with `valueAsNumber`, so the form already
// hands zod real numbers — mirrors serviceSchema.ts's convention.
export const fuelFormSchema = z
  .object({
    capacityLiters: z
      .number({ message: 'Capacity is required' })
      .positive('Capacity must be greater than 0'),
    currentLiters: z
      .number({ message: 'Remaining liters is required' })
      .min(0, 'Remaining liters must not be negative'),
    // The form field converts an empty input to undefined itself (see
    // AdminFuelUpdateModal's `setValueAs`), so this stays a plain optional
    // number rather than a z.preprocess — which would otherwise make the
    // resolver's input/output types diverge and break useForm's generic.
    pricePerLiter: z.number().min(0, 'Price must not be negative').optional(),
  })
  .refine((data) => data.currentLiters <= data.capacityLiters, {
    message: 'Remaining liters cannot exceed capacity',
    path: ['currentLiters'],
  });

export type FuelFormValues = z.infer<typeof fuelFormSchema>;
