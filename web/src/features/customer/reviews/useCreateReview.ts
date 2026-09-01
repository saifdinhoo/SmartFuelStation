import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { createReview } from './reviewsApi';
import { MY_REVIEWS_KEY } from './useMyReviews';
import type { CreateReviewInput } from './types';

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (input: CreateReviewInput) => createReview(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: MY_REVIEWS_KEY });
      queryClient.invalidateQueries({ queryKey: ['bookings', input.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      showToast({ title: 'Review submitted', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not submit your review'),
        variant: 'destructive',
      });
    },
  });

  return {
    createReview: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
