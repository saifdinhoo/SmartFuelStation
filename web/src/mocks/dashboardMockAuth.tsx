import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuthUser } from '@/features/auth/authApi';
import type { Notification } from '@/features/notifications/types';

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

const mockNotifications: Notification[] = [
  {
    id: 1,
    userId: 1,
    type: 'BOOKING_CREATED',
    title: 'New booking request',
    message: 'A customer requested Oil Change for 3:00 PM.',
    isRead: false,
    relatedBookingId: null,
    relatedProviderId: null,
    relatedReviewId: null,
    relatedQueueEntryId: null,
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: 2,
    userId: 1,
    type: 'PROVIDER_REGISTERED',
    title: 'Provider approval pending',
    message: 'Al-Nour Auto Service has registered and is awaiting approval.',
    isRead: false,
    relatedBookingId: null,
    relatedProviderId: null,
    relatedReviewId: null,
    relatedQueueEntryId: null,
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  },
  {
    id: 3,
    userId: 1,
    type: 'NEW_REVIEW',
    title: 'New review',
    message: 'You received a new 5-star review.',
    isRead: true,
    relatedBookingId: null,
    relatedProviderId: null,
    relatedReviewId: null,
    relatedQueueEntryId: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
  },
];

interface MockDashboardAuthValue {
  role: 'PROVIDER' | 'ADMIN';
  user: AuthUser;
  notifications: Notification[];
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
