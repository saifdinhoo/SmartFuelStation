import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarCheck,
  ClipboardCheck,
  ListOrdered,
  MessageSquareWarning,
  Star,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAdminOverview } from './useAdminOverview';
import { useProviderApprovals } from '@/features/admin/providers/useProviderApprovals';
import { PendingApprovalsList } from './PendingApprovalsList';
import { RecentRegistrationsList } from './RecentRegistrationsList';
import { RecentComplaintsList } from './RecentComplaintsList';

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
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
  const { data, viewState, errorMessage, reload } = useAdminOverview();
  const {
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

      {viewState === 'error' && (
        <ErrorState onRetry={reload} description={errorMessage ?? undefined} />
      )}

      {viewState === 'loading' && <LoadingSkeleton />}

      {viewState === 'ready' && data && (
        <>
          <Reveal className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Total users"
              value={data.users.total}
              icon={Users}
              hint={`${data.users.admins} admin${data.users.admins === 1 ? '' : 's'}`}
            />
            <StatCard label="Customers" value={data.users.customers} icon={Users} />
            <StatCard label="Providers" value={data.providers.total} icon={Building2} />
            <StatCard
              label="Pending approval"
              value={data.providers.pending}
              icon={ClipboardCheck}
            />
            <StatCard label="Approved" value={data.providers.approved} icon={ClipboardCheck} />
            <StatCard label="Open now" value={data.providers.openNow} icon={Building2} />
          </Reveal>

          <Reveal delay={0.05} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total bookings" value={data.bookings.total} icon={CalendarCheck} />
            <StatCard label="Active" value={data.bookings.active} icon={CalendarCheck} />
            <StatCard label="Completed" value={data.bookings.completed} icon={CalendarCheck} />
            <StatCard
              label="Cancelled"
              value={data.bookings.cancelled}
              icon={CalendarCheck}
              hint={`${data.bookings.rejected} rejected`}
            />
            <StatCard label="In queue now" value={data.queue.activeEntries} icon={ListOrdered} />
            <StatCard
              label="Services"
              value={data.catalog.services}
              icon={Wrench}
              hint={`${data.catalog.activeCategories}/${data.catalog.categories} categories active`}
            />
          </Reveal>

          <Reveal delay={0.1} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total reviews" value={data.reviews.total} icon={Star} />
            <StatCard
              label="Avg. rating"
              value={
                data.reviews.averageRating === null ? '—' : data.reviews.averageRating.toFixed(1)
              }
              icon={Star}
            />
            <StatCard
              label="Open complaints"
              value={data.complaints.open}
              icon={MessageSquareWarning}
            />
            <StatCard
              label="Total complaints"
              value={data.complaints.total}
              icon={MessageSquareWarning}
            />
          </Reveal>

          <Reveal delay={0.15}>
            <PendingApprovalsList
              items={pendingApprovals}
              viewState={approvalsViewState}
              onApprove={approve}
              onReload={reloadApprovals}
            />
          </Reveal>

          <Reveal delay={0.2} className="grid gap-4 lg:grid-cols-2">
            <RecentRegistrationsList
              items={data.recentRegistrations.map((r) => ({
                id: String(r.id),
                name: r.name,
                role: r.role === 'PROVIDER' ? 'PROVIDER' : 'CUSTOMER',
                date: new Date(r.createdAt).toLocaleDateString(),
              }))}
            />
            {data.recentComplaints.length === 0 ? (
              <Card>
                <CardHeader>
                  <h2 className="text-heading-3">Recent complaints</h2>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    title="No complaints"
                    description="Nothing has been reported on the platform."
                  />
                </CardContent>
              </Card>
            ) : (
              <RecentComplaintsList
                items={data.recentComplaints.map((c) => ({
                  id: String(c.id),
                  subject: c.subject,
                  submittedBy: c.submittedBy.name,
                  againstProvider: c.provider.businessName,
                  severity: c.severity.toLowerCase() as 'low' | 'medium' | 'high',
                  date: new Date(c.createdAt).toLocaleDateString(),
                }))}
              />
            )}
          </Reveal>

          <Reveal delay={0.25}>
            <Card>
              <CardHeader>
                <h2 className="text-heading-3">Jump to</h2>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {[
                  { to: '/admin/providers', label: 'Providers' },
                  { to: '/admin/customers', label: 'Users' },
                  { to: '/admin/bookings', label: 'Bookings' },
                  { to: '/admin/complaints', label: 'Complaints' },
                  { to: '/admin/reviews', label: 'Reviews' },
                  { to: '/admin/analytics', label: 'Analytics' },
                  { to: '/admin/categories', label: 'Categories' },
                ].map((link) => (
                  <Link key={link.to} to={link.to}>
                    <Badge variant="secondary">{link.label}</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </Reveal>
        </>
      )}
    </div>
  );
}
