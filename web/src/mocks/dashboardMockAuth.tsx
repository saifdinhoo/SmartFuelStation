import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuthUser } from '@/features/auth/authApi';
import type { NotificationData } from '@/components/dashboard/NotificationsDropdown';

// Dev-only mock so the dashboard shell (sidebar/topbar/nav) can be built
// and previewed without a real login. The shell components themselves take
// role/user/notifications as plain props, so this is NOT a dependency of
// the shell — it's just what feeds the /dashboard-preview page. The real
// /provider/dashboard and /admin/dashboard routes use the real AuthProvider
// instead.

const mockUsers: Record<'PROVIDER' | 'ADMIN', AuthUser> = {
  PROVIDER: { id: 1, name: 'Ahmad Auto Garage', email: 'provider1@test.com', role: 'PROVIDER' },
  ADMIN: { id: 2, name: 'Sara Ahmed', email: 'admin@smartfuelstation.com', role: 'ADMIN' },
};

const mockNotifications: NotificationData[] = [
  { id: '1', title: 'New booking request', time: '5 minutes ago', read: false },
  { id: '2', title: 'Provider approval pending', time: '1 hour ago', read: false },
  { id: '3', title: 'Weekly summary is ready', time: 'Yesterday', read: true },
];

interface MockDashboardAuthValue {
  role: 'PROVIDER' | 'ADMIN';
  user: AuthUser;
  notifications: NotificationData[];
  setRole: (role: 'PROVIDER' | 'ADMIN') => void;
}

const MockDashboardAuthContext = createContext<MockDashboardAuthValue | null>(null);

export function MockDashboardAuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<'PROVIDER' | 'ADMIN'>('PROVIDER');

  return (
    <MockDashboardAuthContext.Provider
      value={{ role, user: mockUsers[role], notifications: mockNotifications, setRole }}
    >
      {children}
    </MockDashboardAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook pair, intentional
export function useMockDashboardAuth() {
  const context = useContext(MockDashboardAuthContext);
  if (!context)
    throw new Error('useMockDashboardAuth must be used within a MockDashboardAuthProvider');
  return context;
}
