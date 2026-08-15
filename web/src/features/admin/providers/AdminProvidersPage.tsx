import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, Star, XCircle } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatCard } from '@/components/dashboard/StatCard';
import { useProviderApprovals } from './useProviderApprovals';
import type { AdminProvider } from './types';

const APPROVAL_OPTIONS = [
  { value: 'ALL', label: 'All providers' },
  { value: 'PENDING', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
];

type PendingAction = { provider: AdminProvider; approve: boolean } | null;

export function AdminProvidersPage() {
  const {
    viewState,
    errorMessage,
    providers,
    pending,
    approved,
    isMutating,
    approve,
    revoke,
    reload,
  } = useProviderApprovals();

  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<PendingAction>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return providers
      .filter((p) =>
        approvalFilter === 'ALL'
          ? true
          : approvalFilter === 'APPROVED'
            ? p.isApproved
            : !p.isApproved,
      )
      .filter((p) =>
        term === ''
          ? true
          : p.businessName.toLowerCase().includes(term) ||
            p.user.email.toLowerCase().includes(term) ||
            p.address.toLowerCase().includes(term),
      );
  }, [providers, approvalFilter, search]);

  async function handleConfirm() {
    if (!action) return;
    try {
      if (action.approve) await approve(action.provider.id);
      else await revoke(action.provider.id);
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Providers</h1>
        <p className="text-body-sm text-muted-foreground">
          Review registrations and manage which businesses can accept bookings.
        </p>
      </div>

      {viewState === 'error' && (
        <ErrorState
          title="Could not load providers"
          description={errorMessage ?? undefined}
          onRetry={reload}
        />
      )}

      {viewState !== 'error' && (
        <>
          <Reveal className="grid grid-cols-3 gap-4">
            <StatCard label="Total" value={providers.length} icon={Building2} />
            <StatCard label="Approved" value={approved.length} icon={CheckCircle2} />
            <StatCard label="Pending" value={pending.length} icon={XCircle} />
          </Reveal>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <SearchInput
                label="Search providers"
                hideLabel
                placeholder="Search by business, email or address…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              label="Approval"
              hideLabel
              options={APPROVAL_OPTIONS}
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
            />
          </div>

          {viewState === 'loading' && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          )}

          {viewState === 'ready' && filtered.length === 0 && (
            <EmptyState
              icon={Building2}
              title={providers.length === 0 ? 'No providers yet' : 'No providers match'}
              description={
                providers.length === 0
                  ? 'Provider registrations will appear here.'
                  : 'Try a different filter or search term.'
              }
            />
          )}

          {viewState === 'ready' && filtered.length > 0 && (
            <Reveal delay={0.05} className="flex flex-col gap-3">
              {filtered.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{p.businessName}</p>
                        <p className="text-caption">
                          {p.address} · {p.user.name} · {p.user.email}
                          {p.user.phone ? ` · ${p.user.phone}` : ''}
                        </p>
                        <p className="text-caption mt-1">
                          Registered {new Date(p.createdAt).toLocaleDateString()}
                          {p.approvedAt
                            ? ` · Approved ${new Date(p.approvedAt).toLocaleDateString()}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={p.isApproved ? 'success' : 'warning'}>
                          {p.isApproved ? 'Approved' : 'Pending'}
                        </Badge>
                        <Badge variant={p.isOpen ? 'success' : 'secondary'}>
                          {p.isOpen ? 'Open' : 'Closed'}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-body-sm flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                      <span>{p.services.length} services</span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" />
                        {p._count.reviews} reviews
                      </span>
                      <span>{p._count.queueEntries} queue entries</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {p.isApproved ? (
                        <Button
                          variant="destructive"
                          className="h-8 px-3 text-xs"
                          disabled={isMutating}
                          onClick={() => setAction({ provider: p, approve: false })}
                        >
                          Revoke approval
                        </Button>
                      ) : (
                        <>
                          <Button
                            className="h-8 px-3 text-xs"
                            disabled={isMutating}
                            onClick={() => setAction({ provider: p, approve: true })}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            className="h-8 px-3 text-xs"
                            disabled={isMutating}
                            onClick={() => setAction({ provider: p, approve: false })}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </Reveal>
          )}
        </>
      )}

      <ConfirmDialog
        open={action !== null}
        onClose={() => setAction(null)}
        onConfirm={handleConfirm}
        title={action?.approve ? 'Approve provider?' : 'Reject this provider?'}
        description={
          action?.approve
            ? `${action.provider.businessName} will be able to accept bookings.`
            : `${action?.provider.businessName} will be marked not approved and closed, so customers can no longer find or book it. Existing bookings are unaffected. Note: the database records this the same way as "never reviewed" — there is no separate rejected state.`
        }
        confirmLabel={action?.approve ? 'Approve' : 'Reject'}
        danger={!action?.approve}
        isLoading={isMutating}
      />
    </div>
  );
}
