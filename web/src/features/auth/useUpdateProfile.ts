import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthProvider';
import { updateProfile } from './authApi';
import type { UpdateProfileFormValues } from './updateProfileSchema';

// Shared by any role's Settings/Profile page — one endpoint, one hook.
// Refreshes the in-memory session user on success, so the updated name
// shows up everywhere identity is displayed (topbar, sidebar, this page)
// without a manual page reload.
export function useUpdateProfile() {
  const { updateUser } = useAuth();

  const mutation = useMutation({
    mutationFn: (values: UpdateProfileFormValues) => updateProfile(values),
    onSuccess: (updated) => updateUser(updated),
  });

  return {
    updateProfile: mutation.mutateAsync,
    isPending: mutation.isPending,
    reset: mutation.reset,
  };
}
