import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchAdminOverview } from '@/features/admin/adminApi';

export type AdminOverviewViewState = 'loading' | 'error' | 'ready';

// Single cache key for the platform snapshot. Every figure comes from
// GET /admin/overview, which counts real rows — there is no client-side
// derivation and no mock fallback.
export const ADMIN_OVERVIEW_QUERY_KEY = ['admin', 'overview'];

export function useAdminOverview() {
  const query = useQuery({ queryKey: ADMIN_OVERVIEW_QUERY_KEY, queryFn: fetchAdminOverview });

  const viewState: AdminOverviewViewState = query.isPending
    ? 'loading'
    : query.isError
      ? 'error'
      : 'ready';

  return {
    data: query.data,
    viewState,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load the admin overview')
      : null,
    reload: () => query.refetch(),
  };
}
