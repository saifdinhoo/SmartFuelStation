import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { registerSchema, type RegisterFormValues } from './registerSchema';
import { register as registerUser } from './authApi';

export function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'CUSTOMER' },
  });

  const role = watch('role');

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      const result = await registerUser(values);
      localStorage.setItem('token', result.token);
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setServerError(err.response?.data.message ?? 'Registration failed');
      } else {
        setServerError('Registration failed');
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-sm)]"
      >
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <UserPlus className="h-8 w-8 text-primary" />
          <h1 className="text-heading-3">Create your account</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Select
            label="Account type"
            error={errors.role?.message}
            options={[
              { value: 'CUSTOMER', label: 'Customer' },
              { value: 'PROVIDER', label: 'Service Provider' },
            ]}
            {...register('role')}
          />

          {role === 'PROVIDER' && (
            <>
              <Input
                label="Business name"
                error={errors.businessName?.message}
                {...register('businessName')}
              />
              <Input label="Address" error={errors.address?.message} {...register('address')} />
              <p className="text-caption">
                Your provider account will need admin approval before it&apos;s active.
              </p>
            </>
          )}

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
            Register
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
