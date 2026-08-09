import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { TranslateButton } from '@/components/common/TranslateButton';
import type { Review } from './types';

export function RecentReviewsList({ reviews }: { reviews: Review[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Star className="h-4 w-4 text-primary" />
        <h2 className="text-heading-3">Recent Reviews</h2>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            description="Customer reviews will appear here after their first booking."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {reviews.map((review) => (
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
        )}
      </CardContent>
    </Card>
  );
}
