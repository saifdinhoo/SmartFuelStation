import { useNavigate } from 'react-router-dom';
import { CheckCheck, RefreshCw } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNotifications } from './useNotifications';
import { useMarkNotificationRead } from './useMarkNotificationRead';
import { useMarkAllNotificationsRead } from './useMarkAllNotificationsRead';
import type { Notification } from './types';

// Only deep-link to routes that actually exist for the current role — see
// the same rule in NotificationsDropdown.tsx. No booking-detail route
// exists for ADMIN and no single-complaint route exists at all.
function notificationTarget(notification: Notification, role: string): string | null {
  if (notification.relatedBookingId) {
    if (role === 'CUSTOMER') return `/customer/bookings/${notification.relatedBookingId}`;
    if (role === 'PROVIDER') return `/provider/bookings/${notification.relatedBookingId}`;
  }
  return null;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, isPending, isError, errorMessage, reload } = useNotifications();
  const { markRead } = useMarkNotificationRead();
  const { markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function handleClick(notification: Notification) {
    if (!notification.isRead) markRead(notification.id);
    const target = user ? notificationTarget(notification, user.role) : null;
    if (target) navigate(target);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-heading-2">Notifications</h1>
          <p className="text-body-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              onClick={() => markAllRead()}
              disabled={isMarkingAll}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            className="h-9 w-9 p-0"
            onClick={() => reload()}
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isError && (
        <ErrorState
          onRetry={reload}
          description={errorMessage ?? 'Could not load notifications.'}
        />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      )}

      {!isError && !isPending && notifications.length === 0 && (
        <EmptyState
          title="No notifications yet"
          description="We'll let you know when something needs your attention."
        />
      )}

      {!isError && !isPending && notifications.length > 0 && (
        <Reveal>
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleClick(notification)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-start hover:bg-muted"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      notification.isRead ? 'bg-transparent' : 'bg-primary'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-body font-medium text-foreground">{notification.title}</p>
                    <p className="text-body-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-caption mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </div>
  );
}
