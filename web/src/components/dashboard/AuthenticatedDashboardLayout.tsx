import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { useNotifications } from '@/features/notifications/useNotifications';
import { useUnreadCount } from '@/features/notifications/useUnreadCount';
import { useMarkNotificationRead } from '@/features/notifications/useMarkNotificationRead';
import { useMarkAllNotificationsRead } from '@/features/notifications/useMarkAllNotificationsRead';

// Wires the (prop-driven, reusable) DashboardLayout to the real AuthProvider
// and notification hooks, for actual logged-in Provider/Admin/Customer
// routes. Assumes it's already behind a RoleRoute, so `user` is guaranteed
// to exist.
export function AuthenticatedDashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications } = useNotifications();
  const { count: unreadCount } = useUnreadCount();
  const { markRead } = useMarkNotificationRead();
  const { markAllRead } = useMarkAllNotificationsRead();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <DashboardLayout
      role={user.role}
      user={user}
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkNotificationRead={markRead}
      onMarkAllNotificationsRead={markAllRead}
      onLogout={handleLogout}
    >
      {children}
    </DashboardLayout>
  );
}
