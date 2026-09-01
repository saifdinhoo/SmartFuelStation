import { useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useMyReviews } from './useMyReviews';
import { useDeleteReview } from './useDeleteReview';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`h-4 w-4 ${value <= rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  );
}

export function MyReviewsPage() {
  const { reviews, isPending, isError, errorMessage, reload } = useMyReviews();
  const { deleteReview, isPending: isDeleting } = useDeleteReview();
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  async function handleConfirmDelete() {
    if (pendingDeleteId === null) return;
    await deleteReview(pendingDeleteId);
    setPendingDeleteId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">My Reviews</h1>
        <p className="text-body-sm text-muted-foreground">
          Reviews you have left for completed bookings.
        </p>
      </div>

      {isError && (
        <ErrorState onRetry={reload} description={errorMessage ?? 'Could not load your reviews.'} />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      )}

      {!isError && !isPending && reviews.length === 0 && (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Reviews you leave for completed bookings will show up here."
        />
      )}

      {!isError && !isPending && reviews.length > 0 && (
        <Reveal className="flex flex-col gap-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                  <p className="font-medium text-foreground">{review.provider.businessName}</p>
                  <Stars rating={review.rating} />
                  {review.comment && (
                    <p className="text-body-sm text-muted-foreground">{review.comment}</p>
                  )}
                  <p className="text-caption">{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
                <Button
                  variant="ghost"
                  className="h-9 w-9 shrink-0 p-0 text-destructive"
                  aria-label="Delete review"
                  onClick={() => setPendingDeleteId(review.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </Reveal>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete this review?"
        description="This cannot be undone."
        confirmLabel="Delete review"
        danger
        isLoading={isDeleting}
      />
    </div>
  );
}
