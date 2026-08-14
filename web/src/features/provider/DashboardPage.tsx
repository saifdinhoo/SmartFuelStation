import { AuthenticatedDashboardLayout } from '@/components/dashboard/AuthenticatedDashboardLayout';
import { ProviderOverview } from './dashboard/ProviderOverview';

export function ProviderDashboardPage() {
  return (
    <AuthenticatedDashboardLayout>
      <ProviderOverview />
    </AuthenticatedDashboardLayout>
  );
}
