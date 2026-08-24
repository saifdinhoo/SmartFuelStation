import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Service } from './types';

interface ServiceCardListProps {
  services: Service[];
  isLoading: boolean;
  onToggleAvailability: (id: number) => void;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

export function ServiceCardList({
  services,
  isLoading,
  onToggleAvailability,
  onEdit,
  onDelete,
}: ServiceCardListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="md:hidden">
        <EmptyState title="No services found" description="No services match your filters." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {services.map((service) => (
        <Card key={service.id}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">{service.name}</p>
                <Badge variant="secondary" className="mt-1">
                  {service.category}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => onEdit(service)}
                  aria-label={`Edit ${service.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => onDelete(service)}
                  aria-label={`Delete ${service.name}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                ${service.price.toFixed(2)} · {service.durationMinutes} min
              </span>
              <Switch
                checked={service.available}
                onChange={() => onToggleAvailability(service.id)}
                label="Available"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
