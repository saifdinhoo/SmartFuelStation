import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  fetchQueue,
  createWalkIn,
  updateQueueStatus,
  reorderQueue,
  removeQueueEntry,
} from './queueApi';
import {
  selectWaiting,
  selectInService,
  selectCompletedTodayCount,
  selectAverageWaitMinutes,
} from './queueSelectors';

export const QUEUE_QUERY_KEY = ['queue'];

export type QueueViewState = 'loading' | 'error' | 'ready';

// No optimistic updates here by design: queue order and status are shared,
// provider-facing operational state — a wrong optimistic guess (e.g. two
// staff members reordering at once) is worse than a brief pending state.
// Every mutation waits for the real backend response, then invalidates the
// query so the UI reflects exactly what the database has.
export function useProviderQueue() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({ queryKey: QUEUE_QUERY_KEY, queryFn: fetchQueue });
  const raw = query.data ?? [];

  const waiting = selectWaiting(raw);
  const inService = selectInService(raw);
  const completedToday = selectCompletedTodayCount(raw);
  const averageWaitMinutes = selectAverageWaitMinutes(waiting);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
    // A queue mutation can change a linked booking's status too (see
    // queue.service.js's Booking synchronization) — keep that in sync too.
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  }

  const addWalkInMutation = useMutation({
    mutationFn: (input: { customerName: string; providerServiceId: number }) => createWalkIn(input),
    onSuccess: (created) => {
      invalidate();
      showToast({ title: `${created.customerName} added to the queue`, variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not add walk-in customer'),
        variant: 'destructive',
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) => reorderQueue(orderedIds),
    onSuccess: () => invalidate(),
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not save new queue order'),
        variant: 'destructive',
      });
    },
  });

  const startServiceMutation = useMutation({
    mutationFn: (id: number) => updateQueueStatus(id, 'IN_SERVICE'),
    onSuccess: () => invalidate(),
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not start service, please try again'),
        variant: 'destructive',
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => updateQueueStatus(id, 'COMPLETED'),
    onSuccess: () => {
      invalidate();
      showToast({ title: 'Service completed', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not complete service, please try again'),
        variant: 'destructive',
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeQueueEntry(id),
    onSuccess: () => {
      invalidate();
      showToast({ title: 'Removed from queue', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not remove entry, please try again'),
        variant: 'destructive',
      });
    },
  });

  function moveWaitingEntry(id: string, direction: 'up' | 'down') {
    const index = waiting.findIndex((e) => e.id === id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= waiting.length) return;

    const reordered = [...waiting];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    reorderMutation.mutate(reordered.map((e) => Number(e.id)));
  }

  const isMutating =
    addWalkInMutation.isPending ||
    reorderMutation.isPending ||
    startServiceMutation.isPending ||
    completeMutation.isPending ||
    removeMutation.isPending;

  const viewState: QueueViewState = query.isPending ? 'loading' : query.isError ? 'error' : 'ready';

  return {
    viewState,
    errorMessage: query.isError ? getErrorMessage(query.error, 'Could not load the queue') : null,
    waiting,
    inService,
    hasAnyEntries: waiting.length + inService.length > 0,
    completedToday,
    averageWaitMinutes,
    reload: () => query.refetch(),
    isMutating,
    isReordering: reorderMutation.isPending,
    addWalkInCustomer: (input: { customerName: string; providerServiceId: number }) =>
      addWalkInMutation.mutateAsync(input),
    moveWaitingEntry,
    beginService: (id: string) => startServiceMutation.mutateAsync(Number(id)),
    complete: (id: string) => completeMutation.mutateAsync(Number(id)),
    remove: (id: string) => removeMutation.mutateAsync(Number(id)),
  };
}
