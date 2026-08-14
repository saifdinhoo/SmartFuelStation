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
import { useProviderApprovals } from '@/features/admin/providers/useProviderApprovals';
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
    </div>
  );
}

export function AdminOverview() {
  const { user } = useAuth();
  const { data, viewState, simulateLoading, simulateEmpty, simulateError, reload } =
    useAdminOverview();
  const {
    totalProviders,
    pending: pendingApprovals,
    viewState: approvalsViewState,
    approve,
    reload: reloadApprovals,
  } = useProviderApprovals();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Welcome back, {user?.name}</h1>
        <p className="text-body-sm text-muted-foreground">Platform-wide operations at a glance.</p>
      </div>

      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-body-sm mb-3 text-muted-foreground">
          Demo controls — only affect the still-mocked sections below (customers, bookings,
          complaints, charts). Total providers, pending approvals, and the approval queue are real
          data from the database.
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

      <Reveal className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total customers"
          value={viewState === 'ready' && data ? data.summary.totalCustomers : '—'}
          icon={Users}
        />
        <StatCard label="Total providers" value={totalProviders} icon={Building2} />
        <StatCard label="Pending approvals" value={pendingApprovals.length} icon={ClipboardCheck} />
        <StatCard
          label="Active bookings"
          value={viewState === 'ready' && data ? data.summary.activeBookings : '—'}
          icon={CalendarCheck}
        />
        <StatCard
          label="Open complaints"
          value={viewState === 'ready' && data ? data.summary.openComplaints : '—'}
          icon={MessageSquareWarning}
        />
        <StatCard
          label="Avg. rating"
          value={viewState === 'ready' && data ? data.summary.averageRating.toFixed(1) : '—'}
          icon={Star}
        />
      </Reveal>

      <Reveal delay={0.05}>
        <PendingApprovalsList
          items={pendingApprovals}
          viewState={approvalsViewState}
          onApprove={approve}
          onReload={reloadApprovals}
        />
      </Reveal>

      {viewState === 'error' && (
        <ErrorState onRetry={reload} description="Could not load the admin overview." />
      )}

      {viewState === 'loading' && <LoadingSkeleton />}

      {viewState === 'ready' && data && (
        <>
          <Reveal delay={0.1} className="grid gap-4 lg:grid-cols-2">
            <UserGrowthChart data={data.userGrowth} />
            <PlatformBookingTrendChart data={data.bookingTrend} />
          </Reveal>

          <Reveal delay={0.15} className="grid gap-4 lg:grid-cols-2">
            <ProviderCategoryChart data={data.providerCategories} />
            <PlatformHealthCard status={data.platformHealth} />
          </Reveal>

          <Reveal delay={0.2} className="grid gap-4 lg:grid-cols-2">
            <RecentRegistrationsList items={data.recentRegistrations} />
            <RecentComplaintsList items={data.recentComplaints} />
          </Reveal>
        </>
      )}
    </div>
  );
}
