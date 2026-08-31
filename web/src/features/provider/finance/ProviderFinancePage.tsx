import { useState } from 'react';
import { Banknote, CheckCircle2, Clock, Percent, TrendingUp, Wallet } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueChart } from '@/features/finance/RevenueChart';
import { SettlementStatusBadge } from '@/features/finance/SettlementStatusBadge';
import type { FinanceRange } from '@/features/finance/types';
import { useOwnCommission, useOwnFinanceSummary, useOwnFinanceTransactions } from './useProviderFinance';

const RANGE_OPTIONS: { value: FinanceRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Read-only, end to end. There is deliberately no edit control on this page
// for anything — a provider can view its own earnings and commission rate
// but cannot change either; only ADMIN can (see the admin finance
// dashboard's commission management and settlement actions).
export function ProviderFinancePage() {
  const [range, setRange] = useState<FinanceRange>('30d');

  const { summary, isPending, isError, errorMessage, reload } = useOwnFinanceSummary(range);
  const { transactions, isPending: txPending } = useOwnFinanceTransactions();
  const { commission } = useOwnCommission();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-2">My Earnings</h1>
          <p className="text-body-sm text-muted-foreground">
            Real revenue and settlement history from your completed bookings.
          </p>
        </div>
        <Select
          label="Range"
          hideLabel
          className="w-40"
          value={range}
          onChange={(e) => setRange(e.target.value as FinanceRange)}
          options={RANGE_OPTIONS}
        />
      </div>

      {isError && (
        <ErrorState
          title="Could not load your earnings"
          description={errorMessage ?? undefined}
          onRetry={reload}
        />
      )}

      {!isError && isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {!isError && !isPending && summary && (
        <Reveal className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Gross Revenue" value={money(summary.grossServiceValue)} icon={Banknote} />
            <StatCard
              label="Platform Fees"
              value={money(summary.platformCommissionRevenue)}
              icon={TrendingUp}
            />
            <StatCard label="Net Earnings" value={money(summary.providerNetEarnings)} icon={Wallet} />
            <StatCard label="Pending" value={money(summary.pendingSettlementAmount)} icon={Clock} />
            <StatCard label="Settled" value={money(summary.settledAmount)} icon={CheckCircle2} />
            <StatCard
              label="Platform commission"
              value={`${commission?.commissionRate ?? summary.commissionRate}%`}
              icon={Percent}
              hint="Set by the platform admin. You cannot edit this — changes only ever apply to future completed bookings."
            />
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Net Earnings Over Time</h2>
            </CardHeader>
            <CardContent>
              {summary.trend.every((p) => p.net === 0) ? (
                <p className="text-body-sm text-muted-foreground">
                  No completed bookings recorded in this range yet.
                </p>
              ) : (
                <RevenueChart trend={summary.trend} netOnly />
              )}
            </CardContent>
          </Card>
        </Reveal>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-heading-3">Transaction history</h2>
        </CardHeader>
        <CardContent>
          {!txPending && transactions && transactions.length === 0 && (
            <EmptyState
              icon={Banknote}
              title="No earnings yet"
              description="Completed bookings will appear here once a customer's service is marked complete."
            />
          )}

          {txPending && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          )}

          {!txPending && transactions && transactions.length > 0 && (
            <div className="flex flex-col gap-2">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {t.booking?.serviceName ?? `Booking #${t.bookingId}`}
                    </p>
                    <p className="text-caption">
                      {new Date(t.createdAt).toLocaleString()} · Gross {money(t.grossAmount)} · Fee{' '}
                      {t.commissionRate}% ({money(t.commissionAmount)}) · Net{' '}
                      {money(t.providerNetAmount)}
                    </p>
                  </div>
                  <SettlementStatusBadge status={t.settlementStatus} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
