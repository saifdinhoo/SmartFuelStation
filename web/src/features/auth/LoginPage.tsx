import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { AutomotivePattern } from '@/components/common/AutomotivePattern';
import { useAuth } from '@/app/providers/AuthProvider';
import type { AuthUser } from './authApi';
import { loginSchema, type LoginFormValues } from './authSchema';
import { login } from './authApi';

// Where each role lands after login.
const dashboardByRole: Record<AuthUser['role'], string> = {
  ADMIN: '/admin/dashboard',
  PROVIDER: '/provider/dashboard',
  CUSTOMER: '/customer/search',
};

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithResult } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const result = await login(values);
      loginWithResult(result, rememberMe);
      navigate(dashboardByRole[result.user.role]);
    } catch (err) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setServerError(err.response?.data.message ?? 'Login failed');
      } else {
        setServerError('Login failed');
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-primary p-12 lg:flex">
        <AutomotivePattern />
        <div className="relative z-10 max-w-sm text-primary-foreground">
          <h2 className="text-heading-1 mb-3">Smart Automotive Service Platform</h2>
          <p className="text-body-sm opacity-90">
            Manage your service center, track bookings, and grow your business — all in one place.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-4 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-sm)]"
        >
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <LogIn className="h-8 w-8 text-primary" />
            <h1 className="text-heading-3">Welcome back</h1>
            <p className="text-caption">Log in to your provider or admin account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-between">
              <Checkbox
                label="Remember me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
              Log in
            </Button>
          </form>

          <p className="text-caption mt-6 text-center">
            No account?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
