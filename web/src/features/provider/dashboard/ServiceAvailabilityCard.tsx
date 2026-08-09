import { Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { ServiceAvailability } from './types';

export function ServiceAvailabilityCard({ services }: { services: ServiceAvailability[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Wrench className="h-4 w-4 text-primary" />
        <h2 className="text-heading-3">Service Availability</h2>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {services.map((service) => (
            <li key={service.id} className="flex items-center justify-between text-sm">
              {service.name}
              <Badge variant={service.available ? 'success' : 'secondary'}>
                {service.available ? 'Available' : 'Unavailable'}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
