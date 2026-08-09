import type { QueueEntry } from './types';

// No real-time sockets yet and no backend queue endpoints — this task is
// explicitly mock-only. Kept as its own module so swapping in real
// apiClient/Socket.IO calls later only touches this one file.

let queue: QueueEntry[] = [
  { id: '1', customerName: 'Sami Rasheed', service: 'Oil Change', status: 'in-service' },
  { id: '2', customerName: 'Huda Nasser', service: 'Tire Repair', status: 'waiting' },
  { id: '3', customerName: 'Karim Fadel', service: 'Battery Check', status: 'waiting' },
  { id: '4', customerName: 'Rana Aziz', service: 'General Inspection', status: 'waiting' },
];

let completedToday = 6;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const FAILURE_CHANCE = 0.15;

function maybeFail(message: string) {
  if (Math.random() < FAILURE_CHANCE) {
    throw new Error(message);
  }
}

export async function fetchQueue(mode: 'ready' | 'empty' = 'ready') {
  await delay(700);
  return {
    entries: mode === 'empty' ? [] : clone(queue),
    completedToday,
  };
}

export async function addWalkIn(input: {
  customerName: string;
  service: string;
}): Promise<QueueEntry> {
  await delay(500);
  maybeFail('Failed to add walk-in customer');
  const created: QueueEntry = { ...input, id: crypto.randomUUID(), status: 'waiting' };
  queue = [...queue, created];
  return clone(created);
}

export async function persistQueueOrder(orderedIds: string[]): Promise<void> {
  await delay(300);
  maybeFail('Failed to save new order');
  const byId = new Map(queue.map((entry) => [entry.id, entry]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter((e): e is QueueEntry => Boolean(e));
  const untouched = queue.filter((entry) => !orderedIds.includes(entry.id));
  queue = [...untouched, ...reordered];
}

export async function startService(id: string): Promise<void> {
  await delay(500);
  maybeFail('Failed to start service');
  queue = queue.map((entry) => (entry.id === id ? { ...entry, status: 'in-service' } : entry));
}

export async function completeEntry(id: string): Promise<void> {
  await delay(500);
  maybeFail('Failed to complete service');
  queue = queue.filter((entry) => entry.id !== id);
  completedToday += 1;
}

export async function removeEntry(id: string): Promise<void> {
  await delay(500);
  maybeFail('Failed to remove entry');
  queue = queue.filter((entry) => entry.id !== id);
}
