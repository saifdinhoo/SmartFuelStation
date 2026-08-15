import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Star, Trash2 } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatCard } from '@/components/dashboard/StatCard';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchAdminReviews, deleteReview, type AdminReview } from '@/features/admin/adminApi';
import { ADMIN_OVERVIEW_QUERY_KEY } from '@/features/admin/dashboard/useAdminOverview';

const RATING_OPTIONS = [
  { value: 'ALL', label: 'All ratings' },
  { value: '5', label: '5 stars' },
  { value: '4', label: '4 stars' },
  { value: '3', label: '3 stars' },
  { value: '2', label: '2 stars' },
  { value: '1', label: '1 star' },
];

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

export function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [rating, setRating] = useState('ALL');
  const [deleting, setDeleting] = useState<AdminReview | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'reviews', rating],
    queryFn: () => fetchAdminReviews({ rating }),
  });

  // Moderation reuses the pre-existing DELETE /reviews/:id, which already
  // grants ADMIN permission in review.service.js — no new permission model.
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ADMIN_OVERVIEW_QUERY_KEY });
      showToast({ title: 'Review removed', variant: 'success' });
    },
    onError: (err) =>
      showToast({
        title: getErrorMessage(err, 'Could not remove this review'),
        variant: 'destructive',
      }),
  });

  const reviews = query.data ?? [];
  const average =
    reviews.length === 0
      ? null
      : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;

  async function handleConfirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Reviews</h1>
        <p className="text-body-sm text-muted-foreground">
          Every review on the platform. Remove any that breach your content rules.
        </p>
      </div>

      {query.isError && (
        <ErrorState
          title="Could not load reviews"
          description={getErrorMessage(query.error, 'Please try again.')}
          onRetry={() => query.refetch()}
        />
      )}

      {!query.isError && (
        <>
          <Reveal className="grid grid-cols-2 gap-4">
            <StatCard label="Shown" value={reviews.length} icon={MessageSquare} />
            <StatCard
              label="Avg. rating (shown)"
              value={average === null ? '—' : average.toFixed(1)}
              icon={Star}
            />
          </Reveal>

          <div className="sm:max-w-xs">
            <Select
              label="Filter by rating"
              hideLabel
              options={RATING_OPTIONS}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </div>

          {query.isPending && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          )}

          {!query.isPending && reviews.length === 0 && (
            <EmptyState
              icon={MessageSquare}
              title="No reviews"
              description="Customers can review a provider after a completed booking."
            />
          )}

          {!query.isPending && reviews.length > 0 && (
            <Reveal delay={0.05} className="flex flex-col gap-3">
              {reviews.map((r) => (
                <Card key={r.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {r.customer.name} → {r.provider.businessName}
                      </p>
                      <p className="text-caption">
                        {r.customer.email} · {new Date(r.createdAt).toLocaleDateString()}
                        {r.bookingId === null ? ' · no linked booking' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stars rating={r.rating} />
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        aria-label={`Delete review by ${r.customer.name}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => setDeleting(r)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  {r.comment && (
                    <CardContent>
                      <p className="text-body-sm text-foreground">{r.comment}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </Reveal>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
        title="Delete this review?"
        description={`This permanently removes ${deleting?.customer.name}'s review of ${deleting?.provider.businessName} and changes that business's average rating. This cannot be undone.`}
        confirmLabel="Delete review"
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
