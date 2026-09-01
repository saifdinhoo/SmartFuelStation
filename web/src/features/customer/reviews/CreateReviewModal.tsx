import { useState } from 'react';
import { Star } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useCreateReview } from './useCreateReview';

interface CreateReviewModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: number;
  businessName: string;
}

export function CreateReviewModal({ open, onClose, bookingId, businessName }: CreateReviewModalProps) {
  const { createReview, isPending } = useCreateReview();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRating(0);
      setHoverRating(0);
      setComment('');
    }
  }

  async function submit() {
    if (rating < 1) return;
    try {
      await createReview({ bookingId, rating, comment: comment.trim() ? comment : undefined });
      onClose();
    } catch {
      // Already surfaced by useCreateReview's own toast.
    }
  }

  const displayedRating = hoverRating || rating;

  return (
    <Modal open={open} onClose={onClose} title={`Review ${businessName}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">Rating</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} star${value === 1 ? '' : 's'}`}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(value)}
                className="p-0.5"
              >
                <Star
                  className={`h-7 w-7 ${
                    value <= displayedRating
                      ? 'fill-warning text-warning'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Comment (optional)"
          placeholder="How was your experience?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} isLoading={isPending} disabled={rating < 1}>
            Submit review
          </Button>
        </div>
      </div>
    </Modal>
  );
}
