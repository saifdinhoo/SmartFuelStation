import {
  Building2,
  CalendarCheck,
  ClipboardCheck,
  MessageSquareWarning,
  Star,
  Users,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Reveal } from '@/components/common/Reveal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAdminOverview } from './useAdminOverview';
import { UserGrowthChart } from './UserGrowthChart';
import { PlatformBookingTrendChart } from './PlatformBookingTrendChart';
import { ProviderCategoryChart } from './ProviderCategoryChart';
import { RecentRegistrationsList } from './RecentRegistrationsList';
import { RecentComplaintsList } from './RecentComplaintsList';
import { PendingApprovalsList } from './PendingApprovalsList';
import { PlatformHealthCard } from './PlatformHealthCard';

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <Skeleton className="h-56 rounded-lg" />
    </div>
  );
}

export function AdminOverview() {
  const { user } = useAuth();
  const {
    data,
    viewState,
    approve,
    reject,
    simulateLoading,
    simulateEmpty,
    simulateError,
    reload,
  } = useAdminOverview();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Welcome back, {user?.name}</h1>
        <p className="text-body-sm text-muted-foreground">Platform-wide operations at a glance.</p>
      </div>

      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-body-sm mb-3 text-muted-foreground">
          Demo controls — not part of the real dashboard, just for showing each state.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={simulateLoading}>
            Reload (loading)
          </Button>
          <Button variant="ghost" onClick={simulateEmpty}>
            Simulate empty
          </Button>
          <Button variant="ghost" onClick={simulateError}>
            Simulate error
          </Button>
        </div>
      </div>

      {viewState === 'error' && (
        <ErrorState onRetry={reload} description="Could not load the admin overview." />
      )}

      {viewState === 'loading' && <LoadingSkeleton />}

      {viewState === 'ready' && data && (
        <>
          <Reveal className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total customers" value={data.summary.totalCustomers} icon={Users} />
            <StatCard
              label="Total providers"
              value={data.summary.totalProviders}
              icon={Building2}
            />
            <StatCard
              label="Pending approvals"
              value={data.summary.pendingApprovals}
              icon={ClipboardCheck}
            />
            <StatCard
              label="Active bookings"
              value={data.summary.activeBookings}
              icon={CalendarCheck}
            />
            <StatCard
              label="Open complaints"
              value={data.summary.openComplaints}
              icon={MessageSquareWarning}
            />
            <StatCard
              label="Avg. rating"
              value={data.summary.averageRating.toFixed(1)}
              icon={Star}
            />
          </Reveal>

          <Reveal delay={0.05} className="grid gap-4 lg:grid-cols-2">
            <UserGrowthChart data={data.userGrowth} />
            <PlatformBookingTrendChart data={data.bookingTrend} />
          </Reveal>

          <Reveal delay={0.1} className="grid gap-4 lg:grid-cols-2">
            <ProviderCategoryChart data={data.providerCategories} />
            <PlatformHealthCard status={data.platformHealth} />
          </Reveal>

          <Reveal delay={0.15} className="grid gap-4 lg:grid-cols-2">
            <RecentRegistrationsList items={data.recentRegistrations} />
            <RecentComplaintsList items={data.recentComplaints} />
          </Reveal>

          <Reveal delay={0.2}>
            <PendingApprovalsList
              items={data.pendingApprovals}
              onApprove={approve}
              onReject={reject}
            />
          </Reveal>
        </>
      )}
    </div>
  );
}
