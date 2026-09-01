import { useState } from 'react';
import { MessageSquareWarning, Plus } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMyComplaints } from './useMyComplaints';
import { CreateComplaintModal } from './CreateComplaintModal';
import type { ComplaintSeverity, ComplaintStatus } from './types';

const STATUS_VARIANT: Record<ComplaintStatus, 'warning' | 'secondary' | 'success' | 'destructive'> = {
  OPEN: 'warning',
  IN_REVIEW: 'secondary',
  RESOLVED: 'success',
  DISMISSED: 'destructive',
};

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In review',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

const SEVERITY_LABEL: Record<ComplaintSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export function MyComplaintsPage() {
  const { complaints, isPending, isError, errorMessage, reload } = useMyComplaints();
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-2">My Complaints</h1>
          <p className="text-body-sm text-muted-foreground">
            Issues you've reported about a business.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          File a complaint
        </Button>
      </div>

      {isError && (
        <ErrorState onRetry={reload} description={errorMessage ?? 'Could not load your complaints.'} />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {!isError && !isPending && complaints.length === 0 && (
        <EmptyState
          icon={MessageSquareWarning}
          title="No complaints filed"
          description="If a business lets you down, you can report it here."
        />
      )}

      {!isError && !isPending && complaints.length > 0 && (
        <Reveal className="flex flex-col gap-3">
          {complaints.map((complaint) => (
            <Card key={complaint.id}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{complaint.subject}</p>
                    <p className="text-body-sm text-muted-foreground">
                      {complaint.provider.businessName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary">{SEVERITY_LABEL[complaint.severity]}</Badge>
                    <Badge variant={STATUS_VARIANT[complaint.status]}>
                      {STATUS_LABEL[complaint.status]}
                    </Badge>
                  </div>
                </div>
                {complaint.details && (
                  <p className="text-body-sm text-muted-foreground">{complaint.details}</p>
                )}
                <p className="text-caption">{new Date(complaint.createdAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </Reveal>
      )}

      <CreateComplaintModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
