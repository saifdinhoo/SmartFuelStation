import { Badge } from '@/components/ui/Badge';
import type { SettlementStatus } from './types';

const LABELS: Record<SettlementStatus, string> = {
  PENDING: 'Pending',
  SETTLED: 'Settled',
};

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  return <Badge variant={status === 'SETTLED' ? 'success' : 'warning'}>{LABELS[status]}</Badge>;
}
