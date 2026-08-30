import { useQuery } from '@tanstack/react-query';
import { fetchUnreadCount } from './notificationsApi';

export const UNREAD_COUNT_KEY = ['notifications', 'unread-count'];

export function useUnreadCount() {
  const query = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: fetchUnreadCount,
  });

  return {
    count: query.data ?? 0,
    isPending: query.isPending,
  };
}
