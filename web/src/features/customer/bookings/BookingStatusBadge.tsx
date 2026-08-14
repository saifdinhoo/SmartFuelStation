import { Badge } from '@/components/ui/Badge';
import { STATUS_LABEL, type BookingStatus } from './types';

const VARIANT: Record<
  BookingStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  ARRIVED: 'default',
  IN_QUEUE: 'default',
  IN_SERVICE: 'success',
  COMPLETED: 'success',
  CANCELLED: 'secondary',
  REJECTED: 'destructive',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
