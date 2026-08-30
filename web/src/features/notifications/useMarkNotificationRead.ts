import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markNotificationRead } from './notificationsApi';
import { NOTIFICATIONS_KEY } from './useNotifications';
import { UNREAD_COUNT_KEY } from './useUnreadCount';

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });

  return {
    markRead: mutation.mutate,
    isPending: mutation.isPending,
  };
}
