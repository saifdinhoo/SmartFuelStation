import { useState } from 'react';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuditLog } from './useAuditLog';
import { AUDIT_ACTIONS, type AuditAction } from './types';

const ACTION_LABELS: Record<AuditAction, string> = {
  PROVIDER_APPROVED: 'Provider approved',
  PROVIDER_REJECTED: 'Provider rejected',
  CATEGORY_CREATED: 'Category created',
  CATEGORY_UPDATED: 'Category updated',
  CATEGORY_DELETED: 'Category deleted',
  FUEL_INVENTORY_UPDATED: 'Fuel inventory updated',
  FINANCE_SETTLED: 'Finance settled',
  COMMISSION_RATE_UPDATED: 'Commission rate updated',
  BOOKING_STATUS_CHANGED: 'Booking status changed',
  BOOKING_POLICY_UPDATED: 'Booking policy updated',
  SYSTEM_BACKUP_EXPORTED: 'System backup exported',
};

const ACTION_OPTIONS = [
  { value: 'ALL', label: 'All actions' },
  ...AUDIT_ACTIONS.map((action) => ({ value: action, label: ACTION_LABELS[action] })),
];

function formatMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata || Object.keys(metadata).length === 0) return '—';
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ');
}

export function AdminAuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | 'ALL'>('ALL');

  const { page: result, isPending, isError, errorMessage, reload } = useAuditLog({ page, action, pageSize: 20 });

  function changeAction(next: AuditAction | 'ALL') {
    setAction(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Audit log</h1>
        <p className="text-body-sm text-muted-foreground">
          A real, append-only record of administrative actions — who did what, and when. Nothing
          here can be edited or removed through the app.
        </p>
      </div>

      {isError && (
        <ErrorState title="Could not load the audit log" description={errorMessage ?? ''} onRetry={reload} />
      )}

      {!isError && (
        <>
          <div className="sm:max-w-xs">
            <Select
              label="Filter by action"
              hideLabel
              options={ACTION_OPTIONS}
              value={action}
              onChange={(e) => changeAction(e.target.value as AuditAction | 'ALL')}
            />
          </div>

          {isPending && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          )}

          {!isPending && result && result.items.length === 0 && (
            <EmptyState
              icon={History}
              title="No audit entries"
              description="Administrative actions — approvals, category changes, settlements, and more — will appear here as they happen."
            />
          )}

          {!isPending && result && result.items.length > 0 && (
            <Reveal delay={0.05} className="flex flex-col gap-3">
              {result.items.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="flex flex-col gap-1 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{ACTION_LABELS[entry.action]}</p>
                      <p className="text-caption">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-body-sm text-muted-foreground">
                      {entry.admin.name} ({entry.admin.email}) · {entry.entityType}
                      {entry.entityId !== null ? ` #${entry.entityId}` : ''}
                    </p>
                    <p className="text-caption">{formatMetadata(entry.metadata)}</p>
                  </CardContent>
                </Card>
              ))}
            </Reveal>
          )}

          {result && result.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="text-caption">
                Page {result.page} of {result.totalPages} · {result.total} total
              </span>
              <Button
                variant="secondary"
                disabled={page >= result.totalPages}
                onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
