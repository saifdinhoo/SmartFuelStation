import { useMutation } from '@tanstack/react-query';
import { deactivateOwnAccount } from './providerProfileApi';

// No cache update on success — the caller logs out and navigates to /login
// immediately after, so there is nothing left in this session to keep in
// sync (see ProviderSettingsPage's onConfirmDeactivate).
export function useDeactivateAccount() {
  const mutation = useMutation({ mutationFn: deactivateOwnAccount });

  return {
    deactivate: () => mutation.mutateAsync(),
    isDeactivating: mutation.isPending,
  };
}
