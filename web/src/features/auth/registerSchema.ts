import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['CUSTOMER', 'PROVIDER']),
    businessName: z.string().optional(),
    address: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'PROVIDER') {
      if (!data.businessName) {
        ctx.addIssue({
          code: 'custom',
          message: 'Business name is required for a provider account',
          path: ['businessName'],
        });
      }
      if (!data.address) {
        ctx.addIssue({
          code: 'custom',
          message: 'Address is required for a provider account',
          path: ['address'],
        });
      }
    }
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
