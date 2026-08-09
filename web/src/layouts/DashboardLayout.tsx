import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { AuthUser } from '@/features/auth/authApi';
import { getNavForRole } from '@/features/dashboard/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileDrawer } from '@/components/dashboard/MobileDrawer';
import { Topbar } from '@/components/dashboard/Topbar';
import type { NotificationData } from '@/components/dashboard/NotificationsDropdown';

const SIDEBAR_COLLAPSED_KEY = 'dashboard-sidebar-collapsed';

interface DashboardLayoutProps {
  role: AuthUser['role'];
  user: AuthUser;
  notifications: NotificationData[];
  onLogout: () => void;
  children: ReactNode;
}

export function DashboardLayout({
  role,
  user,
  notifications,
  onLogout,
  children,
}: DashboardLayoutProps) {
  const navItems = getNavForRole(role);
  const homePath = navItems[0]?.path ?? '/';
  const settingsPath = navItems.find((item) => item.label.includes('Settings'))?.path ?? homePath;

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  // Auto-close the mobile drawer on navigation. Resetting state during
  // render (React's documented pattern for this) instead of in an effect —
  // avoids an extra render pass and the "avoid setState in an effect" rule.
  const [lastPathname, setLastPathname] = useState(location.pathname);
  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname);
    setMobileDrawerOpen(false);
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        navItems={navItems}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />
      <MobileDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        navItems={navItems}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          navItems={navItems}
          homePath={homePath}
          settingsPath={settingsPath}
          user={user}
          notifications={notifications}
          onLogout={onLogout}
          onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
