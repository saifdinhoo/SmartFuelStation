import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/app/providers/ToastProvider';
import {
  fetchQueue,
  addWalkIn,
  persistQueueOrder,
  startService,
  completeEntry,
  removeEntry,
} from './mockQueueApi';
import { AVG_MINUTES_PER_SERVICE, type QueueEntry } from './types';

export type QueueViewState = 'loading' | 'ready';

export function useProviderQueue() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [viewState, setViewState] = useState<QueueViewState>('loading');
  const { showToast } = useToast();

  const load = useCallback(async (mode: 'ready' | 'empty' = 'ready') => {
    setViewState('loading');
    const result = await fetchQueue(mode);
    setEntries(result.entries);
    setCompletedToday(result.completedToday);
    setViewState('ready');
  }, []);

  useEffect(() => {
    // Initial data fetch on mount — the canonical effect use case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const waiting = useMemo(() => entries.filter((e) => e.status === 'waiting'), [entries]);
  const inService = useMemo(() => entries.filter((e) => e.status === 'in-service'), [entries]);

  const waitingWithEstimate = useMemo(
    () =>
      waiting.map((entry, index) => ({
        ...entry,
        waitMinutes: (index + 1) * AVG_MINUTES_PER_SERVICE,
      })),
    [waiting],
  );

  async function addWalkInCustomer(input: { customerName: string; service: string }) {
    const created = await addWalkIn(input);
    setEntries((current) => [...current, created]);
    showToast({ title: `${created.customerName} added to the queue`, variant: 'success' });
  }

  async function persistOrder(newWaitingOrder: QueueEntry[]) {
    const orderedIds = newWaitingOrder.map((e) => e.id);
    try {
      await persistQueueOrder(orderedIds);
    } catch {
      showToast({ title: 'Could not save new queue order', variant: 'destructive' });
      await load();
    }
  }

  function moveWaitingEntry(id: string, direction: 'up' | 'down') {
    const index = waiting.findIndex((e) => e.id === id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= waiting.length) return;

    const reorderedWaiting = [...waiting];
    [reorderedWaiting[index], reorderedWaiting[swapWith]] = [
      reorderedWaiting[swapWith],
      reorderedWaiting[index],
    ];

    setEntries((current) => [
      ...current.filter((e) => e.status !== 'waiting'),
      ...reorderedWaiting,
    ]); // optimistic
    persistOrder(reorderedWaiting);
  }

  async function beginService(id: string) {
    setEntries((current) => current.map((e) => (e.id === id ? { ...e, status: 'in-service' } : e))); // optimistic
    try {
      await startService(id);
    } catch {
      setEntries((current) => current.map((e) => (e.id === id ? { ...e, status: 'waiting' } : e))); // rollback
      showToast({ title: 'Could not start service, please try again', variant: 'destructive' });
    }
  }

  async function complete(id: string) {
    const removed = entries.find((e) => e.id === id);
    setEntries((current) => current.filter((e) => e.id !== id)); // optimistic
    setCompletedToday((count) => count + 1);
    try {
      await completeEntry(id);
      showToast({ title: 'Service completed', variant: 'success' });
    } catch {
      if (removed) setEntries((current) => [...current, removed]); // rollback
      setCompletedToday((count) => Math.max(0, count - 1));
      showToast({ title: 'Could not complete service, please try again', variant: 'destructive' });
    }
  }

  async function remove(id: string) {
    const removed = entries.find((e) => e.id === id);
    setEntries((current) => current.filter((e) => e.id !== id)); // optimistic
    try {
      await removeEntry(id);
      showToast({ title: 'Removed from queue', variant: 'success' });
    } catch {
      if (removed) setEntries((current) => [...current, removed]); // rollback
      showToast({ title: 'Could not remove entry, please try again', variant: 'destructive' });
    }
  }

  const averageWaitMinutes =
    waitingWithEstimate.length > 0
      ? Math.round(
          waitingWithEstimate.reduce((sum, e) => sum + e.waitMinutes, 0) /
            waitingWithEstimate.length,
        )
      : 0;

  return {
    viewState,
    waiting: waitingWithEstimate,
    inService,
    hasAnyEntries: entries.length > 0,
    completedToday,
    averageWaitMinutes,
    reload: () => load('ready'),
    simulateLoading: () => load('ready'),
    simulateEmpty: () => load('empty'),
    addWalkInCustomer,
    moveWaitingEntry,
    beginService,
    complete,
    remove,
  };
}
