import { useMutation } from '@tanstack/react-query';
import { changePassword } from './authApi';
import type { ChangePasswordFormValues } from './changePasswordSchema';

// Shared by both Customer and Provider Settings — one endpoint, one hook.
export function useChangePassword() {
  const mutation = useMutation({
    mutationFn: (values: Omit<ChangePasswordFormValues, 'confirmPassword'>) =>
      changePassword(values),
  });

  return {
    changePassword: mutation.mutateAsync,
    isPending: mutation.isPending,
    reset: mutation.reset,
  };
}
