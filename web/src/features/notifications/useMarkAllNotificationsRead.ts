import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAllNotificationsRead } from './notificationsApi';
import { NOTIFICATIONS_KEY } from './useNotifications';
import { UNREAD_COUNT_KEY } from './useUnreadCount';

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });

  return {
    markAllRead: mutation.mutate,
    isPending: mutation.isPending,
  };
}
