import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Clock, Navigation, CalendarPlus } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Tooltip } from '@/components/ui/Tooltip';
import { TranslateButton } from '@/components/common/TranslateButton';
import { useProviderDetails } from './useProviderDetails';

export function ProviderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { details, viewState, reload } = useProviderDetails(id ?? '');

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" onClick={() => navigate('/customer/search')}>
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Button>

      {viewState === 'error' && (
        <ErrorState onRetry={reload} description="Could not load this provider." />
      )}

      {viewState === 'loading' && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      )}

      {viewState === 'ready' && details && (
        <Reveal className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-heading-2">{details.businessName}</h1>
                <Badge variant="secondary">{details.category}</Badge>
              </div>
              <p className="text-body-sm mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {details.distanceKm} km · {details.address}
                </span>
                <span className="flex items-center gap-1 text-warning">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {details.rating.toFixed(1)} ({details.reviewCount} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />~{details.estimatedWaitMinutes} min wait
                </span>
              </p>
            </div>
            <StatusIndicator
              variant={details.isOpenNow ? 'success' : 'neutral'}
              label={details.isOpenNow ? 'Open now' : 'Closed'}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${details.coordinates.lat},${details.coordinates.lng}`,
                  '_blank',
                  'noopener,noreferrer',
                )
              }
            >
              <Navigation className="h-4 w-4" />
              Get directions
            </Button>
            <Tooltip label="Reservations are a planned feature — coming soon">
              <Button variant="secondary" disabled aria-disabled title="Coming soon">
                <CalendarPlus className="h-4 w-4" />
                Book now
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Soon
                </span>
              </Button>
            </Tooltip>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">About</h2>
            </CardHeader>
            <CardContent>
              <p className="text-body-sm text-muted-foreground">{details.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Services &amp; prices</h2>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {details.services.map((service) => (
                  <li
                    key={service.id}
                    className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">{service.name}</p>
                      <p className="text-caption">{service.durationMinutes} min</p>
                    </div>
                    <span className="font-medium text-foreground">${service.price}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Reviews</h2>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {details.reviews.map((review) => (
                  <li key={review.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-medium text-foreground">{review.customerName}</p>
                      <span className="flex items-center gap-1 text-warning">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {review.rating}
                      </span>
                    </div>
                    <p className="text-body-sm text-muted-foreground">{review.comment}</p>
                    {review.comment && <TranslateButton text={review.comment} />}
                    <p className="text-caption mt-1">{review.date}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Reveal>
      )}
    </div>
  );
}
