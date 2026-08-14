import { ChevronUp, ChevronDown, PlayCircle, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

interface QueueEntryRowProps {
  position?: number;
  customerName: string;
  service: string;
  status: 'waiting' | 'in-service';
  waitMinutes?: number;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onStartService?: () => void;
  onComplete?: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function QueueEntryRow({
  position,
  customerName,
  service,
  status,
  waitMinutes,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onStartService,
  onComplete,
  onRemove,
  disabled = false,
}: QueueEntryRowProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3">
          {position !== undefined && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {position}
            </span>
          )}
          <div>
            <p className="font-medium text-foreground">{customerName}</p>
            <p className="text-caption">{service}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {status === 'waiting' ? (
            <span className="text-caption hidden sm:inline">~{waitMinutes} min</span>
          ) : (
            <StatusIndicator variant="success" label="In service" />
          )}

          {status === 'waiting' && (
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                aria-label={`Move ${customerName} up`}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                aria-label={`Move ${customerName} down`}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}

          {status === 'waiting' && onStartService && (
            <Button
              variant="secondary"
              onClick={onStartService}
              disabled={disabled}
              aria-label={`Start service for ${customerName}`}
            >
              <PlayCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Start</span>
            </Button>
          )}

          {status === 'in-service' && onComplete && (
            <Button
              variant="secondary"
              onClick={onComplete}
              disabled={disabled}
              aria-label={`Complete service for ${customerName}`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Complete</span>
            </Button>
          )}

          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove ${customerName} from queue`}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
