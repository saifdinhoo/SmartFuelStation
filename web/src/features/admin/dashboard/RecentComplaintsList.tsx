import { MessageSquareWarning } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ComplaintItem, ComplaintSeverity } from './types';

const SEVERITY_BADGE: Record<
  ComplaintSeverity,
  { variant: 'secondary' | 'warning' | 'destructive'; label: string }
> = {
  low: { variant: 'secondary', label: 'Low' },
  medium: { variant: 'warning', label: 'Medium' },
  high: { variant: 'destructive', label: 'High' },
};

export function RecentComplaintsList({ items }: { items: ComplaintItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <MessageSquareWarning className="h-4 w-4 text-primary" />
        <h2 className="text-heading-3">Recent Complaints</h2>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="No open complaints"
            description="Customer complaints about providers will appear here."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-md border border-border p-3 text-sm">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{item.subject}</p>
                  <Badge variant={SEVERITY_BADGE[item.severity].variant} className="shrink-0">
                    {SEVERITY_BADGE[item.severity].label}
                  </Badge>
                </div>
                <p className="text-body-sm text-muted-foreground">
                  {item.submittedBy} against {item.againstProvider}
                </p>
                <p className="text-caption mt-1">{item.date}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
