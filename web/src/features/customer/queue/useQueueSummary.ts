import { useQuery } from '@tanstack/react-query';
import { fetchQueueSummary } from './customerQueueApi';

export function useQueueSummary(providerId: number | string | undefined) {
  const query = useQuery({
    queryKey: ['queue-summary', providerId],
    queryFn: () => fetchQueueSummary(providerId as number | string),
    enabled: providerId !== undefined && providerId !== null && providerId !== '',
  });

  return {
    summary: query.data,
    isPending: query.isPending,
    isError: query.isError,
  };
}
