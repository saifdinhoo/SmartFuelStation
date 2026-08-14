import type { QueueEntry, RawQueueEntry } from './types';

// Shared between useProviderQueue.ts (the Queue page) and the provider
// dashboard's queue widgets, so there is exactly one place that decides
// what "waiting", "in service", "completed today", and "average wait"
// mean — never two independent readings of the same queue.

export function toQueueEntry(entry: RawQueueEntry): QueueEntry {
  return {
    id: String(entry.id),
    customerName: entry.customerName,
    service: entry.providerService.name,
    status: entry.status === 'WAITING' ? 'waiting' : 'in-service',
    waitMinutes: entry.estimatedWaitMinutes ?? undefined,
  };
}

function isCompletedToday(entry: RawQueueEntry): boolean {
  if (entry.status !== 'COMPLETED' || !entry.completedAt) return false;
  const completed = new Date(entry.completedAt);
  const now = new Date();
  return (
    completed.getFullYear() === now.getFullYear() &&
    completed.getMonth() === now.getMonth() &&
    completed.getDate() === now.getDate()
  );
}

export function selectWaiting(entries: RawQueueEntry[]): QueueEntry[] {
  return entries
    .filter((e) => e.status === 'WAITING')
    .sort((a, b) => a.position - b.position)
    .map(toQueueEntry);
}

export function selectInService(entries: RawQueueEntry[]): QueueEntry[] {
  return entries.filter((e) => e.status === 'IN_SERVICE').map(toQueueEntry);
}

export function selectCompletedTodayCount(entries: RawQueueEntry[]): number {
  return entries.filter(isCompletedToday).length;
}

// Deterministic average of each waiting entry's own estimated wait (itself
// derived server-side from real service durations and queue position —
// see queue.service.js's attachWaitEstimates). Never a fabricated constant.
export function selectAverageWaitMinutes(waiting: QueueEntry[]): number {
  const withEstimate = waiting.filter(
    (e): e is QueueEntry & { waitMinutes: number } => typeof e.waitMinutes === 'number',
  );
  if (withEstimate.length === 0) return 0;
  return Math.round(withEstimate.reduce((sum, e) => sum + e.waitMinutes, 0) / withEstimate.length);
}
