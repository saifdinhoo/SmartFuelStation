import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchOwnHours, fetchProviderHours, updateOwnHours } from './schedulingApi';
import type { OperatingHourEntry } from './types';

export const OWN_HOURS_QUERY_KEY = ['provider', 'me', 'hours'];

export function useOwnHours() {
  const query = useQuery({ queryKey: OWN_HOURS_QUERY_KEY, queryFn: fetchOwnHours });

  return {
    hours: query.data,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load your operating hours')
      : null,
    reload: () => query.refetch(),
  };
}

export function useUpdateOwnHours() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (entries: OperatingHourEntry[]) => updateOwnHours(entries),
    onSuccess: (updated) => {
      queryClient.setQueryData(OWN_HOURS_QUERY_KEY, updated);
      // Customers viewing this provider's hours or booking availability may
      // now be looking at stale data.
      queryClient.invalidateQueries({ queryKey: ['providerHours'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      showToast({ title: 'Operating hours saved', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not save your operating hours'),
        variant: 'destructive',
      });
    },
  });

  return {
    save: (entries: OperatingHourEntry[]) => mutation.mutateAsync(entries),
    isSaving: mutation.isPending,
  };
}

// Public read — used on the customer-facing Provider Details page. Kept
// deliberately separate from the booking availability query: this is
// "what hours has this provider set for a normal week", not "what's free
// on one specific date".
export function useProviderHours(providerId: number | string | undefined) {
  const query = useQuery({
    queryKey: ['providerHours', providerId],
    queryFn: () => fetchProviderHours(providerId as number | string),
    enabled: providerId !== undefined,
  });

  return {
    hours: query.data,
    isPending: query.isPending,
    isError: query.isError,
  };
}
