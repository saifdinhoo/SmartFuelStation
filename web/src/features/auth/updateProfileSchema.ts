import { z } from 'zod';

// Mirrors auth.service.js's updateCurrentUser validation — a UX
// convenience, never the authority; the backend re-validates independently.
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim(),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
