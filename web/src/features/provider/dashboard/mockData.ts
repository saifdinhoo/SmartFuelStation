import type { ProviderOverviewData } from './types';

// Backend has no analytics/reviews endpoints yet, and this task is
// explicitly mock-data-only for those (no Socket.IO). These simulate
// realistic latency and occasional failure so the optimistic-update UI has
// something real to demonstrate against. Queue data is real — see
// queue/useProviderQueue.ts — and deliberately absent from this file.

export function buildMockOverview(): ProviderOverviewData {
  return {
    businessName: 'Ahmad Auto Garage',
    isOpen: true,
    todayBookings: 9,
    completedServices: 6,
    averageRating: 4.7,
    revenueThisMonth: 3260,
    upcomingBookings: [
      { id: 'b1', customerName: 'Layla Hassan', service: 'Oil Change', time: 'Today, 2:30 PM' },
      { id: 'b2', customerName: 'Omar Saeed', service: 'Tire Rotation', time: 'Today, 3:15 PM' },
      { id: 'b3', customerName: 'Nadia Kareem', service: 'Battery Check', time: 'Today, 4:00 PM' },
      {
        id: 'b4',
        customerName: 'Yousef Ali',
        service: 'Brake Inspection',
        time: 'Tomorrow, 9:00 AM',
      },
    ],
    services: [
      { id: 's1', name: 'Oil Change', available: true },
      { id: 's2', name: 'Tire Repair', available: true },
      { id: 's3', name: 'Battery Check', available: true },
      { id: 's4', name: 'Brake Inspection', available: false },
      { id: 's5', name: 'Car Wash', available: true },
    ],
    weeklyBookings: [
      { day: 'Mon', bookings: 6 },
      { day: 'Tue', bookings: 8 },
      { day: 'Wed', bookings: 5 },
      { day: 'Thu', bookings: 10 },
      { day: 'Fri', bookings: 12 },
      { day: 'Sat', bookings: 9 },
      { day: 'Sun', bookings: 3 },
    ],
    reviews: [
      {
        id: 'r1',
        customerName: 'Layla Hassan',
        rating: 5,
        comment: 'Fast and friendly service, my car feels brand new.',
        date: '2 days ago',
      },
      {
        id: 'r2',
        customerName: 'Omar Saeed',
        rating: 4,
        comment: 'Good work but the wait was a bit longer than expected.',
        date: '4 days ago',
      },
      {
        id: 'r3',
        customerName: 'Nadia Kareem',
        rating: 5,
        comment: 'Very professional team, explained everything clearly.',
        date: '1 week ago',
      },
    ],
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchProviderOverview(mode: 'ready' | 'empty' | 'error' = 'ready') {
  await delay(700);

  if (mode === 'error') {
    throw new Error('Failed to load dashboard data');
  }

  const data = buildMockOverview();

  if (mode === 'empty') {
    return {
      ...data,
      upcomingBookings: [],
      reviews: [],
    };
  }

  return data;
}

const FAILURE_CHANCE = 0.2;

export async function updateOpenStatus(_nextIsOpen: boolean): Promise<void> {
  await delay(500);
  if (Math.random() < FAILURE_CHANCE) {
    throw new Error('Failed to update status');
  }
}
