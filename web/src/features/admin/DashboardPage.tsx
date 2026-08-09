import { AuthenticatedDashboardLayout } from '@/components/dashboard/AuthenticatedDashboardLayout';
import { AdminOverview } from './dashboard/AdminOverview';

export function AdminDashboardPage() {
  return (
    <AuthenticatedDashboardLayout>
      <AdminOverview />
    </AuthenticatedDashboardLayout>
  );
}
