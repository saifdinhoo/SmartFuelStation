import { useState } from 'react';
import { CheckCircle2, ClipboardCheck, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { AdminProvider } from '@/features/admin/providers/types';
import type { ProviderApprovalsViewState } from '@/features/admin/providers/useProviderApprovals';

interface PendingApprovalsListProps {
  items: AdminProvider[];
  viewState: ProviderApprovalsViewState;
  onApprove: (id: number) => Promise<unknown>;
  onReload: () => void;
}

export function PendingApprovalsList({
  items,
  viewState,
  onApprove,
  onReload,
}: PendingApprovalsListProps) {
  const [approvingItem, setApprovingItem] = useState<AdminProvider | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirm() {
    if (!approvingItem) return;
    setIsConfirming(true);
    try {
      await onApprove(approvingItem.id);
      setApprovingItem(null);
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <h2 className="text-heading-3">Pending Approvals</h2>
        </span>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={onReload}
          aria-label="Refresh pending approvals"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {viewState === 'error' && (
          <ErrorState onRetry={onReload} description="Could not load providers." />
        )}

        {viewState === 'loading' && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))}
          </div>
        )}

        {viewState === 'ready' && items.length === 0 && (
          <EmptyState
            title="No pending approvals"
            description="New provider registrations awaiting review will appear here."
          />
        )}

        {viewState === 'ready' && items.length > 0 && (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{item.businessName}</p>
                  <p className="text-caption">
                    {item.address} · {item.user.email} · Registered{' '}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setApprovingItem(item)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={approvingItem !== null}
        onClose={() => setApprovingItem(null)}
        onConfirm={handleConfirm}
        title="Approve provider?"
        description={`${approvingItem?.businessName} will be approved and can start accepting bookings.`}
        confirmLabel="Approve"
        isLoading={isConfirming}
      />
    </Card>
  );
}
