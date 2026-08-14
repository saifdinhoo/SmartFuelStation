import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchRatingSummary } from './discoveryApi';

// Same queryKey shape as the per-card queries in useNearbyProviders, so
// this reuses the cache if the customer already saw this provider's
// rating in the search list.
export function useProviderRating(providerId: string) {
  const query = useQuery({
    queryKey: ['rating-summary', providerId],
    queryFn: () => fetchRatingSummary(providerId),
    enabled: Boolean(providerId),
  });

  return {
    summary: query.data,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError ? getErrorMessage(query.error, 'Could not load rating') : null,
    reload: query.refetch,
  };
}
