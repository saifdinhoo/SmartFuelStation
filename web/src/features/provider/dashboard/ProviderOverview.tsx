import { useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock, DollarSign, ListOrdered, Star } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Reveal } from '@/components/common/Reveal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatCard } from '@/components/dashboard/StatCard';
import { useProviderQueue } from '@/features/provider/queue/useProviderQueue';
import { AddWalkInModal } from '@/features/provider/queue/AddWalkInModal';
import { useProviderDashboard } from './useProviderDashboard';
import { LiveStatusControl } from './LiveStatusControl';
import { QueueSummaryCard } from './QueueSummaryCard';
import { ServiceAvailabilityCard } from './ServiceAvailabilityCard';
import { WeeklyBookingsChart } from './WeeklyBookingsChart';
import { UpcomingBookingsList } from './UpcomingBookingsList';
import { RecentReviewsList } from './RecentReviewsList';
import { QuickActions } from './QuickActions';
import { DemoControls } from './DemoControls';

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
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

export function ProviderOverview() {
  const { user } = useAuth();
  const {
    data,
    viewState,
    toggleOpenStatus,
    reload,
    simulateLoading,
    simulateEmpty,
    simulateError,
  } = useProviderDashboard();
  const {
    waiting: queueWaiting,
    inService: queueInService,
    averageWaitMinutes,
    isMutating: isQueueMutating,
    beginService,
    addWalkInCustomer,
  } = useProviderQueue();
  const [walkInOpen, setWalkInOpen] = useState(false);

  const queueLength = queueWaiting.length + queueInService.length;
  const nextWaitingEntry = queueWaiting[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Welcome back, {user?.name}</h1>
        <p className="text-body-sm text-muted-foreground">
          Here&apos;s what&apos;s happening today.
        </p>
      </div>

      <DemoControls
        onSimulateLoading={simulateLoading}
        onSimulateEmpty={simulateEmpty}
        onSimulateError={simulateError}
      />

      {viewState === 'error' && <ErrorState onRetry={reload} />}

      {viewState === 'loading' && <LoadingSkeleton />}

      {viewState === 'ready' && data && (
        <>
          <Reveal>
            <LiveStatusControl isOpen={data.isOpen} onToggle={toggleOpenStatus} />
          </Reveal>

          <Reveal delay={0.05} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Queue length" value={queueLength} icon={ListOrdered} />
            <StatCard label="Est. wait" value={`${averageWaitMinutes} min`} icon={Clock} />
            <StatCard label="Today's bookings" value={data.todayBookings} icon={CalendarCheck} />
            <StatCard label="Completed" value={data.completedServices} icon={CheckCircle2} />
            <StatCard label="Avg. rating" value={data.averageRating.toFixed(1)} icon={Star} />
            <StatCard
              label="Revenue (month)"
              value={`$${data.revenueThisMonth.toLocaleString()}`}
              icon={DollarSign}
              hint="Illustrative placeholder — real revenue tracking isn't wired up yet."
            />
          </Reveal>

          <Reveal delay={0.1} className="grid gap-4 lg:grid-cols-2">
            <QueueSummaryCard
              queueLength={queueLength}
              estimatedWaitMinutes={averageWaitMinutes}
              entries={queueWaiting.map((entry, index) => ({
                position: index + 1,
                customerName: entry.customerName,
                service: entry.service,
                waitMinutes: entry.waitMinutes,
              }))}
              onStartNext={() => nextWaitingEntry && beginService(nextWaitingEntry.id)}
              canStartNext={Boolean(nextWaitingEntry)}
              onAddWalkIn={() => setWalkInOpen(true)}
              isBusy={isQueueMutating}
            />
            <ServiceAvailabilityCard services={data.services} />
          </Reveal>

          <AddWalkInModal
            open={walkInOpen}
            onClose={() => setWalkInOpen(false)}
            onSubmit={addWalkInCustomer}
          />

          <Reveal delay={0.15}>
            <WeeklyBookingsChart data={data.weeklyBookings} />
          </Reveal>

          <Reveal delay={0.2} className="grid gap-4 lg:grid-cols-2">
            <UpcomingBookingsList bookings={data.upcomingBookings} />
            <RecentReviewsList reviews={data.reviews} />
          </Reveal>

          <Reveal delay={0.25}>
            <QuickActions />
          </Reveal>
        </>
      )}
    </div>
  );
}
