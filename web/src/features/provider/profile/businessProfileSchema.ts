import { z } from 'zod';

// Coordinates stay strings inside the form (an empty input is "" , not NaN)
// and are validated with a refine, then converted to number|null on submit.
// Keeping the schema's input and output types identical is what lets the
// zodResolver type cleanly against react-hook-form.
const coordinate = (limit: number, label: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        const num = Number(value);
        return Number.isFinite(num) && num >= -limit && num <= limit;
      },
      { message: `${label} must be a number between -${limit} and ${limit}` },
    );

// Mirrors the server-side validation in providerProfile.service.js. The
// server re-checks all of it — this exists to give immediate feedback, not
// to be the authority.
export const businessProfileSchema = z.object({
  businessName: z.string().trim().min(1, 'Business name is required'),
  description: z.string().trim().max(1000, 'Keep the description under 1000 characters').optional(),
  address: z.string().trim().min(1, 'Address is required'),
  name: z.string().trim().min(1, 'Contact name is required'),
  phone: z.string().trim().optional(),
  latitude: coordinate(90, 'Latitude'),
  longitude: coordinate(180, 'Longitude'),
});

export type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>;
