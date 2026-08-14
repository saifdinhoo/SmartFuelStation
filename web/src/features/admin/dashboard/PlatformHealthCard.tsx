import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import type { PlatformHealthStatus } from './types';

const STATUS_LABEL: Record<PlatformHealthStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded performance',
  down: 'Down',
};

const STATUS_VARIANT: Record<PlatformHealthStatus, 'success' | 'warning' | 'destructive'> = {
  operational: 'success',
  degraded: 'warning',
  down: 'destructive',
};

const SERVICES = ['API', 'Database', 'Notifications', 'Payments'] as const;

export function PlatformHealthCard({ status }: { status: PlatformHealthStatus }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="text-heading-3">Platform Health</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-caption rounded-md bg-muted px-3 py-2 text-muted-foreground">
          Placeholder — real infrastructure monitoring isn&apos;t wired up yet. Statuses shown here
          are illustrative.
        </p>
        <ul className="flex flex-col gap-2">
          {SERVICES.map((service) => (
            <li key={service} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{service}</span>
              <StatusIndicator variant={STATUS_VARIANT[status]} label={STATUS_LABEL[status]} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
