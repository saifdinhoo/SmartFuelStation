import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchProviderReviews } from './discoveryApi';

export function useProviderReviews(providerId: string) {
  const query = useQuery({
    queryKey: ['reviews', providerId],
    queryFn: () => fetchProviderReviews(providerId),
    enabled: Boolean(providerId),
  });

  return {
    reviews: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError ? getErrorMessage(query.error, 'Could not load reviews') : null,
    reload: query.refetch,
  };
}
