import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchNotifications } from './notificationsApi';

export const NOTIFICATIONS_KEY = ['notifications'];

export function useNotifications() {
  const query = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: fetchNotifications,
  });

  return {
    notifications: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load notifications')
      : null,
    reload: query.refetch,
  };
}
