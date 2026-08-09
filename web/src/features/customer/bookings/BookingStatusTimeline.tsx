import { Check, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { LIFECYCLE_STEPS, STATUS_LABEL, type BookingStatus } from './types';

interface BookingStatusTimelineProps {
  status: BookingStatus;
  cancelledAt: string | null;
}

export function BookingStatusTimeline({ status, cancelledAt }: BookingStatusTimelineProps) {
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
          <X className="h-4 w-4" />
        </span>
        <div>
          <p className="font-medium text-foreground">{STATUS_LABEL[status]}</p>
          {cancelledAt && (
            <p className="text-caption text-muted-foreground">
              {new Date(cancelledAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentIndex = LIFECYCLE_STEPS.indexOf(status);

  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {LIFECYCLE_STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === LIFECYCLE_STEPS.length - 1;

        return (
          <li key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium',
                  isDone && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary text-primary',
                  !isDone && !isCurrent && 'border-border text-muted-foreground',
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-caption max-w-16 text-center',
                  (isDone || isCurrent) && 'font-medium text-foreground',
                )}
              >
                {STATUS_LABEL[step]}
              </span>
            </div>
            {!isLast && (
              <span
                className={cn('mx-2 h-0.5 w-8 shrink-0', isDone ? 'bg-primary' : 'bg-border')}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
