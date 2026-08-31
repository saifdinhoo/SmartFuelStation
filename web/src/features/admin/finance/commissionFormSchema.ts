import { z } from 'zod';

// Registered with `valueAsNumber`, so the form already hands zod a real
// number — mirrors fuelFormSchema.ts's convention. Server-side validation
// (finance.service.js's validateCommissionRate) enforces the same 0–100
// range independently — this is a UX convenience, never the authority.
export const commissionFormSchema = z.object({
  commissionRate: z
    .number({ message: 'Commission rate is required' })
    .min(0, 'Commission rate must be at least 0')
    .max(100, 'Commission rate must not exceed 100'),
});

export type CommissionFormValues = z.infer<typeof commissionFormSchema>;
