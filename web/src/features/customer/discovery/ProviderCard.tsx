import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Button } from '@/components/ui/Button';
import type { DiscoveredProvider } from './types';

export function ProviderCard({ provider }: { provider: DiscoveredProvider }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-foreground">{provider.businessName}</p>
            <Badge variant="secondary" className="mt-1">
              {provider.category}
            </Badge>
          </div>
          <StatusIndicator
            variant={provider.isOpenNow ? 'success' : 'neutral'}
            label={provider.isOpenNow ? 'Open now' : 'Closed'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {provider.distanceKm} km · {provider.address}
          </span>
          <span className="flex items-center gap-1 text-warning">
            <Star className="h-3.5 w-3.5 fill-current" />
            {provider.rating.toFixed(1)}
            <span className="text-muted-foreground">({provider.reviewCount})</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />~{provider.estimatedWaitMinutes} min wait
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-body-sm text-foreground">
            ${provider.priceFrom}–${provider.priceTo}
          </span>
          <Button
            variant="secondary"
            onClick={() => navigate(`/customer/providers/${provider.id}`)}
          >
            View details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
