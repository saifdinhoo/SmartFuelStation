import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import type { NotificationData } from './NotificationsDropdown';

// Real notifications aren't a built feature yet — empty for now, wired up
// once that exists. The shell itself doesn't care where the data comes from.
const noNotifications: NotificationData[] = [];

// Wires the (prop-driven, reusable) DashboardLayout to the real AuthProvider,
// for actual logged-in Provider/Admin routes. Assumes it's already behind a
// RoleRoute, so `user` is guaranteed to exist.
export function AuthenticatedDashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <DashboardLayout
      role={user.role}
      user={user}
      notifications={noNotifications}
      onLogout={handleLogout}
    >
      {children}
    </DashboardLayout>
  );
}
