import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { setProviderApproval } from '@/features/admin/adminApi';
import { ADMIN_OVERVIEW_QUERY_KEY } from '@/features/admin/dashboard/useAdminOverview';
import { fetchProviders } from './providersApi';

export type ProviderApprovalsViewState = 'loading' | 'error' | 'ready';

// One ['providers'] cache shared by the overview's approval queue and the
// full Providers page — the two used to be separate useState copies that
// could disagree after an approval. Mutations invalidate both this and the
// overview counts, since approving changes the pending/approved totals.
export const PROVIDERS_QUERY_KEY = ['providers'];

export function useProviderApprovals() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({ queryKey: PROVIDERS_QUERY_KEY, queryFn: fetchProviders });
  const providers = useMemo(() => query.data ?? [], [query.data]);

  const approvalMutation = useMutation({
    mutationFn: ({ id, isApproved }: { id: number; isApproved: boolean }) =>
      setProviderApproval(id, isApproved),
    onSuccess: (_result, { id, isApproved }) => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_OVERVIEW_QUERY_KEY });
      const target = providers.find((p) => p.id === id);
      showToast({
        title: `${target?.businessName ?? 'Provider'} ${isApproved ? 'approved' : 'approval revoked'}`,
        variant: 'success',
      });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not update provider approval, please try again'),
        variant: 'destructive',
      });
    },
  });

  const viewState: ProviderApprovalsViewState = query.isPending
    ? 'loading'
    : query.isError
      ? 'error'
      : 'ready';

  return {
    viewState,
    errorMessage: query.isError ? getErrorMessage(query.error, 'Could not load providers') : null,
    providers,
    totalProviders: providers.length,
    pending: useMemo(() => providers.filter((p) => !p.isApproved), [providers]),
    approved: useMemo(() => providers.filter((p) => p.isApproved), [providers]),
    isMutating: approvalMutation.isPending,
    approve: (id: number) => approvalMutation.mutateAsync({ id, isApproved: true }),
    revoke: (id: number) => approvalMutation.mutateAsync({ id, isApproved: false }),
    reload: () => query.refetch(),
  };
}
