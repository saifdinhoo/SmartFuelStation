import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Star } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatCard } from '@/components/dashboard/StatCard';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { useOwnProviderProfile } from '@/features/provider/profile/useOwnProviderProfile';
import { fetchOwnReviews } from '@/features/provider/profile/providerProfileApi';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
        />
      ))}
    </span>
  );
}

const RATING_FILTER_OPTIONS = [
  { value: 'all', label: 'All ratings' },
  { value: '5', label: '5 stars' },
  { value: '4', label: '4 stars' },
  { value: '3', label: '3 stars' },
  { value: '2', label: '2 stars' },
  { value: '1', label: '1 star' },
];

export function ProviderReviewsPage() {
  const { profile, isPending: profilePending, isError: profileError } = useOwnProviderProfile();
  const providerId = profile?.id;

  // GET /providers/:id/reviews already refuses any provider asking for a
  // business other than their own (assertProviderReadAccess), and the id
  // here comes from /providers/me rather than the URL.
  const reviewsQuery = useQuery({
    queryKey: ['provider', 'me', 'reviews', providerId],
    queryFn: () => fetchOwnReviews(providerId as number),
    enabled: providerId !== undefined,
  });

  const [ratingFilter, setRatingFilter] = useState('all');

  const reviews = useMemo(() => {
    const all = reviewsQuery.data ?? [];
    return ratingFilter === 'all' ? all : all.filter((r) => r.rating === Number(ratingFilter));
  }, [reviewsQuery.data, ratingFilter]);

  const isPending = profilePending || reviewsQuery.isPending;
  const isError = profileError || reviewsQuery.isError;
  const totalCount = reviewsQuery.data?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Reviews</h1>
        <p className="text-body-sm text-muted-foreground">
          What customers say about your business.
        </p>
      </div>

      {isError && (
        <ErrorState
          title="Could not load your reviews"
          description={
            reviewsQuery.isError
              ? getErrorMessage(reviewsQuery.error, 'Please try again.')
              : undefined
          }
          onRetry={() => reviewsQuery.refetch()}
        />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      )}

      {!isError && !isPending && profile && (
        <Reveal className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Average rating"
              value={
                profile.rating.averageRating === null
                  ? '—'
                  : profile.rating.averageRating.toFixed(1)
              }
              icon={Star}
            />
            <StatCard label="Total reviews" value={profile.rating.reviewCount} icon={MessageSquare} />
          </div>

          {totalCount === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No reviews yet"
              description="Customers can leave a review after you complete one of their bookings."
            />
          ) : (
            <>
              <div className="sm:max-w-xs">
                <Select
                  label="Filter by rating"
                  hideLabel
                  options={RATING_FILTER_OPTIONS}
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                />
              </div>

              {reviews.length === 0 ? (
                <EmptyState
                  title="No reviews with that rating"
                  description="Try a different filter."
                  action={{ label: 'Show all', onClick: () => setRatingFilter('all') }}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardHeader className="flex flex-row items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{review.customer.name}</p>
                          <p className="text-caption">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Stars rating={review.rating} />
                      </CardHeader>
                      {review.comment && (
                        <CardContent>
                          <p className="text-body-sm text-foreground">{review.comment}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          <p className="text-caption">
            Replying to reviews isn&apos;t available — the database has no field to store a
            provider response.
          </p>
        </Reveal>
      )}
    </div>
  );
}
