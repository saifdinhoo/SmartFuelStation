import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  fetchOwnProfile,
  updateOwnProfile,
  type ProviderProfileUpdate,
} from './providerProfileApi';

// One cache key for the provider's own business record, shared by the
// Business Profile page, Live Status, Services, Reviews and the dashboard
// header. There is deliberately no second store: `isOpen` lives here and
// nowhere else, so a toggle on Live Status is immediately correct on every
// other screen without any cross-page syncing.
export const OWN_PROFILE_QUERY_KEY = ['provider', 'me'];

export function useOwnProviderProfile() {
  const query = useQuery({ queryKey: OWN_PROFILE_QUERY_KEY, queryFn: fetchOwnProfile });

  return {
    profile: query.data,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load your business profile')
      : null,
    reload: () => query.refetch(),
  };
}

export function useUpdateOwnProfile() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (input: ProviderProfileUpdate) => updateOwnProfile(input),
    onSuccess: (updated, variables) => {
      // The PATCH returns the full, freshly-read profile, so the cache is
      // set from the server's answer rather than from what we hoped we
      // wrote — no optimistic guess to reconcile.
      queryClient.setQueryData(OWN_PROFILE_QUERY_KEY, updated);
      // Availability changes affect what customers can book.
      queryClient.invalidateQueries({ queryKey: ['providers'] });

      const onlyToggledOpen =
        Object.keys(variables).length === 1 && variables.isOpen !== undefined;
      showToast({
        title: onlyToggledOpen
          ? updated.isOpen
            ? "You're now open"
            : "You're now closed"
          : 'Business profile updated',
        variant: 'success',
      });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not save your changes, please try again'),
        variant: 'destructive',
      });
    },
  });

  return {
    save: (input: ProviderProfileUpdate) => mutation.mutateAsync(input),
    isSaving: mutation.isPending,
  };
}
