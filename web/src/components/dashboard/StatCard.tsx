import type { ComponentType, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { Info } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ComponentType<{ className?: string }>;
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <p className="text-caption">{label}</p>
            {hint && (
              <Tooltip label={hint}>
                <Info className="h-3 w-3 text-muted-foreground" />
              </Tooltip>
            )}
          </div>
          <p className="text-heading-2">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </CardContent>
    </Card>
  );
}
