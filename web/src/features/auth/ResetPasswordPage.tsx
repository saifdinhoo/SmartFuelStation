import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { resetPasswordSchema, type ResetPasswordFormValues } from './resetPasswordSchema';
import { resetPassword } from './mockPasswordResetApi';

// Placeholder page: the real flow needs a backend reset-password endpoint
// that doesn't exist yet. This validates the form and simulates the call
// so the UI/UX is ready to wire up once that endpoint exists.
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordFormValues) {
    await resetPassword(token ?? '', values.password);
    setSubmitted(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-sm)]"
      >
        {submitted ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <h1 className="text-heading-3">Password reset</h1>
            <p className="text-body-sm text-muted-foreground">
              Your password has been updated. You can now log in.
            </p>
            <Link to="/login" className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <h1 className="text-heading-3">Set a new password</h1>
              <p className="text-caption">Choose something you haven&apos;t used before</p>
            </div>

            {!token && (
              <Alert variant="warning" title="Missing reset token" className="mb-4">
                This link looks incomplete. Request a new one from the forgot password page.
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <PasswordInput
                label="New password"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <PasswordInput
                label="Confirm new password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
                Reset password
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
