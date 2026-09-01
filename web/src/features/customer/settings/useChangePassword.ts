import { useMutation } from '@tanstack/react-query';
import { changePassword } from '@/features/auth/authApi';
import type { ChangePasswordFormValues } from '@/features/auth/changePasswordSchema';

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
