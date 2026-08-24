import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareWarning } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatCard } from '@/components/dashboard/StatCard';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  fetchAdminComplaints,
  updateComplaintStatus,
  type ComplaintSeverity,
  type ComplaintStatus,
} from '@/features/admin/adminApi';
import { ADMIN_OVERVIEW_QUERY_KEY } from '@/features/admin/dashboard/useAdminOverview';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

const SEVERITY_OPTIONS = [
  { value: 'ALL', label: 'All severities' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const SEVERITY_VARIANT: Record<ComplaintSeverity, 'destructive' | 'warning' | 'secondary'> = {
  HIGH: 'destructive',
  MEDIUM: 'warning',
  LOW: 'secondary',
};

const STATUS_VARIANT: Record<ComplaintStatus, 'warning' | 'default' | 'success' | 'secondary'> = {
  OPEN: 'warning',
  IN_REVIEW: 'default',
  RESOLVED: 'success',
  DISMISSED: 'secondary',
};

// Which transitions the UI offers. The backend accepts any of the four
// statuses; this just avoids showing a button for the state you're in.
const NEXT_STATUSES: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ['IN_REVIEW', 'RESOLVED', 'DISMISSED'],
  IN_REVIEW: ['RESOLVED', 'DISMISSED'],
  RESOLVED: ['OPEN'],
  DISMISSED: ['OPEN'],
};

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  OPEN: 'Reopen',
  IN_REVIEW: 'Start review',
  RESOLVED: 'Resolve',
  DISMISSED: 'Dismiss',
};

export function AdminComplaintsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [status, setStatus] = useState('ALL');
  const [severity, setSeverity] = useState('ALL');

  const query = useQuery({
    queryKey: ['admin', 'complaints', { status, severity }],
    queryFn: () => fetchAdminComplaints({ status, severity }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: ComplaintStatus }) =>
      updateComplaintStatus(id, next),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'complaints'] });
      queryClient.invalidateQueries({ queryKey: ADMIN_OVERVIEW_QUERY_KEY });
      showToast({ title: `Complaint marked ${updated.status.toLowerCase()}`, variant: 'success' });
    },
    onError: (err) =>
      showToast({
        title: getErrorMessage(err, 'Could not update this complaint'),
        variant: 'destructive',
      }),
  });

  const complaints = query.data ?? [];
  const openCount = complaints.filter((c) => c.status === 'OPEN').length;
  const highCount = complaints.filter((c) => c.severity === 'HIGH').length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Complaints</h1>
        <p className="text-body-sm text-muted-foreground">
          Reports filed against providers on the platform.
        </p>
      </div>

      {query.isError && (
        <ErrorState
          title="Could not load complaints"
          description={getErrorMessage(query.error, 'Please try again.')}
          onRetry={() => query.refetch()}
        />
      )}

      {!query.isError && (
        <>
          <Reveal className="grid grid-cols-3 gap-4">
            <StatCard label="Shown" value={complaints.length} icon={MessageSquareWarning} />
            <StatCard label="Open" value={openCount} icon={MessageSquareWarning} />
            <StatCard label="High severity" value={highCount} icon={MessageSquareWarning} />
          </Reveal>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Select
              label="Status"
              hideLabel
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
            <Select
              label="Severity"
              hideLabel
              options={SEVERITY_OPTIONS}
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            />
          </div>

          {query.isPending && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          )}

          {!query.isPending && complaints.length === 0 && (
            <EmptyState
              icon={MessageSquareWarning}
              title="No complaints"
              description="Nothing matches these filters."
            />
          )}

          {!query.isPending && complaints.length > 0 && (
            <Reveal delay={0.05} className="flex flex-col gap-3">
              {complaints.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{c.subject}</p>
                      <p className="text-caption">
                        {c.submittedBy.name} ({c.submittedBy.role.toLowerCase()}) →{' '}
                        {c.provider.businessName} · {new Date(c.createdAt).toLocaleDateString()}
                        {c.resolvedAt
                          ? ` · closed ${new Date(c.resolvedAt).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={SEVERITY_VARIANT[c.severity]}>{c.severity}</Badge>
                      <Badge variant={STATUS_VARIANT[c.status]}>
                        {c.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {c.details && <p className="text-body-sm text-foreground">{c.details}</p>}
                    <div className="flex flex-wrap gap-2">
                      {NEXT_STATUSES[c.status].map((next) => (
                        <Button
                          key={next}
                          variant={next === 'DISMISSED' ? 'destructive' : 'secondary'}
                          className="h-8 px-3 text-xs"
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate({ id: c.id, next })}
                        >
                          {STATUS_LABEL[next]}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </Reveal>
          )}

          <p className="text-caption">
            Complaints are read and triaged here. There is no endpoint for an admin to file one —
            complaints are created by users, and no submission UI exists yet.
          </p>
        </>
      )}
    </div>
  );
}
