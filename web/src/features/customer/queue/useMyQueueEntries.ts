import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchMyQueueEntries } from './customerQueueApi';

// Same query key ('queue') as the provider Queue page's useProviderQueue —
// intentional. The backend response shape and scope differ by role, but
// within a single logged-in session there is only ever one role, so
// ['queue'] always means "my queue view" and there is exactly one cached
// reading of it, never two independent ones.
export const QUEUE_QUERY_KEY = ['queue'];

export function useMyQueueEntries() {
  const query = useQuery({ queryKey: QUEUE_QUERY_KEY, queryFn: fetchMyQueueEntries });

  return {
    entries: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load your queue status')
      : null,
    reload: query.refetch,
  };
}
