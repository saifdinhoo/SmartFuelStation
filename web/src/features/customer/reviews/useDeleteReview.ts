import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { deleteReview } from './reviewsApi';
import { MY_REVIEWS_KEY } from './useMyReviews';

export function useDeleteReview() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (id: number) => deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_REVIEWS_KEY });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      showToast({ title: 'Review deleted', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not delete the review'),
        variant: 'destructive',
      });
    },
  });

  return {
    deleteReview: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
