import { ListOrdered, PlayCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { QueueEntry } from '@/features/provider/queue/types';

interface QueueSummaryEntry extends Pick<QueueEntry, 'customerName' | 'service' | 'waitMinutes'> {
  position: number;
}

interface QueueSummaryCardProps {
  queueLength: number;
  estimatedWaitMinutes: number;
  entries: QueueSummaryEntry[];
  onStartNext: () => void;
  canStartNext: boolean;
  onAddWalkIn: () => void;
  isBusy?: boolean;
}

export function QueueSummaryCard({
  queueLength,
  estimatedWaitMinutes,
  entries,
  onStartNext,
  canStartNext,
  onAddWalkIn,
  isBusy = false,
}: QueueSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-primary" />
          <h2 className="text-heading-3">Queue Summary</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onStartNext}
            disabled={!canStartNext || isBusy}
            aria-label="Start service for the next customer"
          >
            <PlayCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onAddWalkIn}
            disabled={isBusy}
            aria-label="Add walk-in"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-body-sm mb-3 text-muted-foreground">
          {queueLength} waiting · ~{estimatedWaitMinutes} min estimated wait
        </p>

        {entries.length === 0 ? (
          <EmptyState title="Queue is empty" description="No customers are currently waiting." />
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li
                key={entry.position}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {entry.position}
                  </span>
                  {entry.customerName}
                  <span className="text-caption">— {entry.service}</span>
                </span>
                <span className="text-caption">~{entry.waitMinutes ?? 0} min</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
