import { MockDashboardAuthProvider, useMockDashboardAuth } from '@/mocks/dashboardMockAuth';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/app/providers/ToastProvider';

// Dev-only preview: lets you see and QA the dashboard shell for both roles
// without logging in. The real /provider/dashboard and /admin/dashboard
// routes use the same DashboardLayout, fed by the real AuthProvider instead.
function ShellPreviewContent() {
  const { role, user, notifications, setRole } = useMockDashboardAuth();
  const { showToast } = useToast();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <DashboardLayout
      role={role}
      user={user}
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkNotificationRead={() => showToast({ title: 'Mark read clicked (mock only)' })}
      onMarkAllNotificationsRead={() => showToast({ title: 'Mark all read clicked (mock only)' })}
      onLogout={() => showToast({ title: 'Logout clicked (mock only)' })}
    >
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-dashed border-border p-4">
          <p className="text-body-sm mb-3 text-muted-foreground">
            Mock role switcher — preview only, not connected to real auth.
          </p>
          <div className="flex gap-2">
            <Button
              variant={role === 'PROVIDER' ? 'primary' : 'secondary'}
              onClick={() => setRole('PROVIDER')}
            >
              View as Provider
            </Button>
            <Button
              variant={role === 'ADMIN' ? 'primary' : 'secondary'}
              onClick={() => setRole('ADMIN')}
            >
              View as Admin
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border p-6">
          <h1 className="text-heading-2 mb-2">Dashboard shell preview</h1>
          <p className="text-body-sm text-muted-foreground">
            Try the sidebar collapse toggle, resize the window to see the mobile drawer, and use the
            theme/language toggles and notification bell in the top bar.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function DashboardShellPreview() {
  return (
    <MockDashboardAuthProvider>
      <ShellPreviewContent />
    </MockDashboardAuthProvider>
  );
}
