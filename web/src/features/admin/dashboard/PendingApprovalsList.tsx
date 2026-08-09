import { useState } from 'react';
import { CheckCircle2, ClipboardCheck, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { PendingApprovalItem } from './types';

interface PendingApprovalsListProps {
  items: PendingApprovalItem[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

type PendingAction = { type: 'approve' | 'reject'; item: PendingApprovalItem } | null;

export function PendingApprovalsList({ items, onApprove, onReject }: PendingApprovalsListProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirm() {
    if (!pendingAction) return;
    setIsConfirming(true);
    try {
      if (pendingAction.type === 'approve') {
        await onApprove(pendingAction.item.id);
      } else {
        await onReject(pendingAction.item.id);
      }
      setPendingAction(null);
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-primary" />
        <h2 className="text-heading-3">Pending Approvals</h2>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="No pending approvals"
            description="New provider registrations awaiting review will appear here."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{item.businessName}</p>
                  <p className="text-caption">
                    {item.category} · Submitted {item.submittedDate}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setPendingAction({ type: 'approve', item })}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setPendingAction({ type: 'reject', item })}
                  >
                    <XCircle className="h-4 w-4 text-destructive" />
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirm}
        title={pendingAction?.type === 'approve' ? 'Approve provider?' : 'Reject provider?'}
        description={
          pendingAction?.type === 'approve'
            ? `${pendingAction.item.businessName} will be approved and can start accepting bookings.`
            : `${pendingAction?.item.businessName} will be rejected and removed from the approval queue.`
        }
        confirmLabel={pendingAction?.type === 'approve' ? 'Approve' : 'Reject'}
        danger={pendingAction?.type === 'reject'}
        isLoading={isConfirming}
      />
    </Card>
  );
}
