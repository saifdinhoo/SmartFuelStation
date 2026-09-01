import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchMyReviews } from './reviewsApi';

export const MY_REVIEWS_KEY = ['reviews', 'me'];

export function useMyReviews() {
  const query = useQuery({
    queryKey: MY_REVIEWS_KEY,
    queryFn: fetchMyReviews,
  });

  return {
    reviews: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError ? getErrorMessage(query.error, 'Could not load your reviews') : null,
    reload: query.refetch,
  };
}
