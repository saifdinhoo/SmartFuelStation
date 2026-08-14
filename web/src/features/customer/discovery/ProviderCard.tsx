import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Button } from '@/components/ui/Button';
import { useQueueSummary } from '@/features/customer/queue/useQueueSummary';
import { getPriceRange, getDistinctCategories } from './providerHelpers';
import type { Provider } from './types';

export function ProviderCard({ provider }: { provider: Provider }) {
  const navigate = useNavigate();
  const priceRange = getPriceRange(provider.services);
  const categories = getDistinctCategories(provider.services);
  const queue = useQueueSummary(provider.id);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-foreground">{provider.businessName}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {categories.length > 0 ? (
                categories.slice(0, 3).map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))
              ) : (
                <span className="text-caption text-muted-foreground">No services listed</span>
              )}
              {categories.length > 3 && (
                <Badge variant="secondary">+{categories.length - 3} more</Badge>
              )}
            </div>
          </div>
          <StatusIndicator
            variant={provider.isOpen ? 'success' : 'neutral'}
            label={provider.isOpen ? 'Open now' : 'Closed'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {provider.distanceKm !== null ? `${provider.distanceKm} km · ` : ''}
            {provider.address}
          </span>
          {provider.averageRating === undefined ? (
            <Skeleton className="h-4 w-16 rounded" />
          ) : provider.averageRating === null ? (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              No ratings yet
            </span>
          ) : (
            <span className="flex items-center gap-1 text-warning">
              <Star className="h-3.5 w-3.5 fill-current" />
              {provider.averageRating.toFixed(1)}
              <span className="text-muted-foreground">
                ({provider.reviewCount} {provider.reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {queue.isPending ? (
              <Skeleton className="h-4 w-16 rounded" />
            ) : queue.isError || !queue.summary ? (
              'Queue unavailable'
            ) : queue.summary.queueLength === 0 ? (
              'No wait'
            ) : (
              `~${queue.summary.estimatedWaitMinutes} min wait`
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-body-sm text-foreground">
            {priceRange
              ? priceRange.min === priceRange.max
                ? `$${priceRange.min}`
                : `$${priceRange.min}–$${priceRange.max}`
              : '—'}
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
