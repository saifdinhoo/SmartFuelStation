import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  CheckCircle2,
  Clock,
  Hash,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/dashboard/StatCard';
import { PROVIDERS_QUERY_KEY } from '@/features/admin/providers/useProviderApprovals';
import { fetchProviders } from '@/features/admin/providers/providersApi';
import { RevenueChart } from '@/features/finance/RevenueChart';
import { SettlementStatusBadge } from '@/features/finance/SettlementStatusBadge';
import type { FinanceRange, SettlementStatus } from '@/features/finance/types';
import {
  useAdminFinanceSummary,
  useAdminFinanceTransactions,
  useProviderCommission,
  useSettleTransaction,
  useUpdateProviderCommission,
} from './useAdminFinance';
import { CommissionEditModal } from './CommissionEditModal';

const RANGE_OPTIONS: { value: FinanceRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SETTLED', label: 'Settled' },
];

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface CommissionTarget {
  id: number;
  name: string;
}

export function AdminFinancePage() {
  const [range, setRange] = useState<FinanceRange>('30d');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | 'ALL'>('ALL');
  const [commissionTarget, setCommissionTarget] = useState<CommissionTarget | null>(null);

  const {
    summary,
    isPending: summaryPending,
    isError: summaryError,
    errorMessage,
    reload,
  } = useAdminFinanceSummary(range);

  // The full, unfiltered list drives the provider breakdown — always real
  // ledger rows, grouped client-side, never a separate estimate.
  const { transactions: allTransactions } = useAdminFinanceTransactions({ status: 'ALL' });

  const { transactions, isPending: txPending, isError: txError } = useAdminFinanceTransactions({
    providerId: providerFilter === 'ALL' ? undefined : Number(providerFilter),
    status: statusFilter,
  });

  const providersQuery = useQuery({ queryKey: PROVIDERS_QUERY_KEY, queryFn: fetchProviders });
  const providers = providersQuery.data ?? [];

  const { settle, isSettling } = useSettleTransaction();
  const { save, isSaving } = useUpdateProviderCommission();
  const { commission: targetCommission } = useProviderCommission(commissionTarget?.id);

  const breakdown = useMemo(() => {
    const rows = allTransactions ?? [];
    const byProvider = new Map<
      number,
      {
        providerId: number;
        providerName: string;
        gross: number;
        commission: number;
        net: number;
        pending: number;
        settled: number;
      }
    >();
    for (const t of rows) {
      const existing = byProvider.get(t.providerId) ?? {
        providerId: t.providerId,
        providerName: t.providerName,
        gross: 0,
        commission: 0,
        net: 0,
        pending: 0,
        settled: 0,
      };
      existing.gross += t.grossAmount;
      existing.commission += t.commissionAmount;
      existing.net += t.providerNetAmount;
      if (t.settlementStatus === 'PENDING') existing.pending += t.providerNetAmount;
      else existing.settled += t.providerNetAmount;
      byProvider.set(t.providerId, existing);
    }
    return [...byProvider.values()].sort((a, b) => b.gross - a.gross);
  }, [allTransactions]);

  async function handleCommissionSubmit(values: { commissionRate: number }) {
    if (!commissionTarget) return;
    await save(commissionTarget.id, values.commissionRate);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-2">Finance</h1>
          <p className="text-body-sm text-muted-foreground">
            Real platform revenue, commission and settlement ledger — computed entirely from
            completed bookings.
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

      {summaryError && (
        <ErrorState
          title="Could not load the finance summary"
          description={errorMessage ?? undefined}
          onRetry={reload}
        />
      )}

      {!summaryError && summaryPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {!summaryError && !summaryPending && summary && (
        <Reveal className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Gross Service Value" value={money(summary.grossServiceValue)} icon={Banknote} />
            <StatCard
              label="Platform Revenue"
              value={money(summary.platformCommissionRevenue)}
              icon={TrendingUp}
            />
            <StatCard label="Provider Net Earnings" value={money(summary.providerNetEarnings)} icon={Wallet} />
            <StatCard
              label="Pending Settlement"
              value={money(summary.pendingSettlementAmount)}
              icon={Clock}
            />
            <StatCard label="Settled Amount" value={money(summary.settledAmount)} icon={CheckCircle2} />
            <StatCard label="Transactions" value={summary.transactionCount} icon={Hash} />
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Revenue Over Time</h2>
            </CardHeader>
            <CardContent>
              {summary.trend.every((p) => p.gross === 0) ? (
                <p className="text-body-sm text-muted-foreground">
                  No completed bookings recorded in this range yet.
                </p>
              ) : (
                <RevenueChart trend={summary.trend} />
              )}
            </CardContent>
          </Card>
        </Reveal>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-heading-3">Provider Breakdown</h2>
        </CardHeader>
        <CardContent>
          {breakdown.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              No provider has any completed, ledgered bookings yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {breakdown.map((row) => (
                <div
                  key={row.providerId}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{row.providerName}</p>
                    <p className="text-caption">
                      Gross {money(row.gross)} · Commission {money(row.commission)} · Net{' '}
                      {money(row.net)}
                    </p>
                    <p className="text-caption">
                      Pending {money(row.pending)} · Settled {money(row.settled)}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    onClick={() =>
                      setCommissionTarget({ id: row.providerId, name: row.providerName })
                    }
                  >
                    Manage commission
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <h2 className="text-heading-3">Transactions</h2>
          <div className="flex gap-2">
            <Select
              label="Provider"
              hideLabel
              className="w-48"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All providers' },
                ...providers.map((p) => ({ value: String(p.id), label: p.businessName })),
              ]}
            />
            <Select
              label="Status"
              hideLabel
              className="w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SettlementStatus | 'ALL')}
              options={STATUS_OPTIONS}
            />
          </div>
        </CardHeader>
        <CardContent>
          {txError && (
            <p className="text-body-sm text-muted-foreground">Could not load transactions.</p>
          )}

          {!txError && txPending && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          )}

          {!txError && !txPending && transactions && transactions.length === 0 && (
            <EmptyState
              icon={Banknote}
              title="No transactions"
              description="No completed bookings match this filter yet."
            />
          )}

          {!txError && !txPending && transactions && transactions.length > 0 && (
            <div className="flex flex-col gap-2">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {t.providerName} — {t.booking?.serviceName ?? `Booking #${t.bookingId}`}
                    </p>
                    <p className="text-caption">
                      {new Date(t.createdAt).toLocaleString()} · Gross {money(t.grossAmount)} ·
                      Commission {t.commissionRate}% ({money(t.commissionAmount)}) · Net{' '}
                      {money(t.providerNetAmount)}
                    </p>
                    {t.settlementStatus === 'SETTLED' && (
                      <p className="text-caption">
                        Settled {t.settledAt ? new Date(t.settledAt).toLocaleString() : ''}
                        {t.settledByAdminName ? ` by ${t.settledByAdminName}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <SettlementStatusBadge status={t.settlementStatus} />
                    {t.settlementStatus === 'PENDING' && (
                      <Button
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        isLoading={isSettling}
                        onClick={() => settle(t.id)}
                      >
                        Mark Settled
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {commissionTarget && (
        <CommissionEditModal
          open={commissionTarget !== null}
          onClose={() => setCommissionTarget(null)}
          providerName={commissionTarget.name}
          currentRate={targetCommission?.commissionRate}
          onSubmit={handleCommissionSubmit}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
