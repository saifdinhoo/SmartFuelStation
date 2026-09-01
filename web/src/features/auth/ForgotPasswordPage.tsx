import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { requestPasswordReset } from './authApi';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from './forgotPasswordSchema';

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null);
    try {
      await requestPasswordReset(values.email);
      setSubmitted(true);
    } catch (err) {
      setServerError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    }
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
            <h1 className="text-heading-3">Check your email</h1>
            <p className="text-body-sm text-muted-foreground">
              If an account exists for that email, we&apos;ve sent a link to reset your password.
            </p>
            <Link to="/login" className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <KeyRound className="h-8 w-8 text-primary" />
              <h1 className="text-heading-3">Forgot your password?</h1>
              <p className="text-caption">We&apos;ll email you a link to reset it</p>
            </div>

            {serverError && (
              <Alert variant="destructive" title="Could not send reset email" className="mb-4">
                {serverError}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
                Send reset link
              </Button>
            </form>

            <p className="text-caption mt-6 text-center">
              <Link to="/login" className="text-primary hover:underline">
                Back to login
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
