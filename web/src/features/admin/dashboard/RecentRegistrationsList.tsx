import { UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { RegistrationActivityItem } from './types';

export function RecentRegistrationsList({ items }: { items: RegistrationActivityItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" />
        <h2 className="text-heading-3">Recent Registration Activity</h2>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="No new registrations"
            description="New customer and provider sign-ups will appear here."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-caption">{item.date}</p>
                </div>
                <Badge variant={item.role === 'PROVIDER' ? 'default' : 'secondary'}>
                  {item.role === 'PROVIDER' ? 'Provider' : 'Customer'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
