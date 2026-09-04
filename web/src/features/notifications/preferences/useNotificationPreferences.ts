import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchNotificationPreferences, updateNotificationPreferences } from './notificationPreferencesApi';
import type { NotificationPreferencesInput } from './types';

const QUERY_KEY = ['notificationPreferences', 'me'];

export function useNotificationPreferences() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchNotificationPreferences,
  });

  return {
    preferences: query.data,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load notification settings')
      : null,
  };
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (input: NotificationPreferencesInput) => updateNotificationPreferences(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData(QUERY_KEY);
      queryClient.setQueryData(QUERY_KEY, (current: unknown) =>
        current ? { ...(current as object), ...input } : current,
      );
      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
      showToast({
        title: getErrorMessage(err, 'Could not update notification settings'),
        variant: 'destructive',
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEY, updated);
    },
  });

  return {
    toggle: (input: NotificationPreferencesInput) => mutation.mutateAsync(input),
    isSaving: mutation.isPending,
  };
}
