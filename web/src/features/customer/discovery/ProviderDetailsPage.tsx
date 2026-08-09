import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Clock, Navigation, CalendarPlus } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Tooltip } from '@/components/ui/Tooltip';
import { TranslateButton } from '@/components/common/TranslateButton';
import { CreateBookingModal } from '@/features/customer/bookings/CreateBookingModal';
import { useProviderDetails } from './useProviderDetails';
import { useProviderRating } from './useProviderRating';
import { useProviderReviews } from './useProviderReviews';
import { getDistinctCategories } from './providerHelpers';

export function ProviderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const providerId = id ?? '';
  const { provider, isPending, isError, errorMessage, notFound, reload } =
    useProviderDetails(providerId);
  const rating = useProviderRating(providerId);
  const reviews = useProviderReviews(providerId);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" onClick={() => navigate('/customer/search')}>
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Button>

      {isError && (
        <ErrorState
          onRetry={reload}
          description={errorMessage ?? 'Could not load this provider.'}
        />
      )}

      {!isError && notFound && (
        <EmptyState
          title="Provider not found"
          description="This provider may no longer be listed."
        />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      )}

      {!isError && !isPending && provider && (
        <Reveal className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-heading-2">{provider.businessName}</h1>
                {getDistinctCategories(provider.services).map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))}
              </div>
              <div className="text-body-sm mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {provider.distanceKm !== null ? `${provider.distanceKm} km · ` : ''}
                  {provider.address}
                </span>
                {rating.isPending ? (
                  <Skeleton className="h-4 w-24 rounded" />
                ) : rating.isError ? (
                  <span className="text-muted-foreground">Rating unavailable</span>
                ) : rating.summary && rating.summary.averageRating !== null ? (
                  <span className="flex items-center gap-1 text-warning">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {rating.summary.averageRating.toFixed(1)} ({rating.summary.reviewCount}{' '}
                    {rating.summary.reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    No ratings yet
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />~{provider.estimatedWaitMinutes} min wait
                </span>
              </div>
            </div>
            <StatusIndicator
              variant={provider.isOpen ? 'success' : 'neutral'}
              label={provider.isOpen ? 'Open now' : 'Closed'}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Tooltip
              label={
                provider.latitude === null || provider.longitude === null
                  ? "This provider hasn't set a location yet"
                  : 'Open in Google Maps'
              }
            >
              <Button
                disabled={provider.latitude === null || provider.longitude === null}
                aria-disabled={provider.latitude === null || provider.longitude === null}
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${provider.latitude},${provider.longitude}`,
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
              >
                <Navigation className="h-4 w-4" />
                Get directions
              </Button>
            </Tooltip>
            <Button variant="secondary" onClick={() => setBookingModalOpen(true)}>
              <CalendarPlus className="h-4 w-4" />
              Book now
            </Button>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">About</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {provider.description ? (
                <>
                  <p className="text-body-sm text-muted-foreground">{provider.description}</p>
                  <TranslateButton text={provider.description} />
                </>
              ) : (
                <p className="text-body-sm text-muted-foreground">No description provided.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Services &amp; prices</h2>
            </CardHeader>
            <CardContent>
              {provider.services.length === 0 ? (
                <EmptyState
                  title="No services listed"
                  description="This provider hasn't added any services yet."
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {provider.services.map((service) => (
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
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Reviews</h2>
            </CardHeader>
            <CardContent>
              {reviews.isError ? (
                <ErrorState
                  onRetry={reviews.reload}
                  description={reviews.errorMessage ?? 'Could not load reviews.'}
                />
              ) : reviews.isPending ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-md" />
                  ))}
                </div>
              ) : reviews.reviews.length === 0 ? (
                <EmptyState
                  title="No reviews yet"
                  description="Be the first to review this provider after a completed booking."
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {reviews.reviews.map((review) => (
                    <li key={review.id} className="rounded-md border border-border p-3 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="font-medium text-foreground">{review.customer.name}</p>
                        <span className="flex items-center gap-1 text-warning">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {review.rating}
                        </span>
                      </div>
                      {review.comment && (
                        <>
                          <p className="text-body-sm text-muted-foreground">{review.comment}</p>
                          <TranslateButton text={review.comment} />
                        </>
                      )}
                      <p className="text-caption mt-1">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>
      )}

      {provider && (
        <CreateBookingModal
          open={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          services={provider.services}
        />
      )}
    </div>
  );
}
