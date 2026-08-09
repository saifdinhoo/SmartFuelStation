import { SERVICE_CATEGORIES } from '@/features/provider/services/types';
import type { AdminOverviewData } from './types';

// Total providers and pending approvals now come from the real /providers
// endpoint (see features/admin/providers). Everything else here — customer
// counts, bookings, complaints, and the charts — has no matching backend
// endpoint yet, so it stays mock until those APIs exist.

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const totalCustomers = 1284;

const PROVIDER_COUNT_BY_CATEGORY: Record<(typeof SERVICE_CATEGORIES)[number], number> = {
  'Oil Change': 46,
  'Tire Repair': 38,
  'Battery Check': 27,
  'Brake Inspection': 31,
  'Car Wash': 29,
  'General Inspection': 21,
};

function buildOverview(): AdminOverviewData {
  return {
    summary: {
      totalCustomers,
      activeBookings: 57,
      openComplaints: 11,
      averageRating: 4.5,
    },
    userGrowth: [
      { label: 'Feb', customers: 780 },
      { label: 'Mar', customers: 860 },
      { label: 'Apr', customers: 945 },
      { label: 'May', customers: 1040 },
      { label: 'Jun', customers: 1160 },
      { label: 'Jul', customers: totalCustomers },
    ],
    bookingTrend: [
      { label: 'Wk 1', bookings: 312 },
      { label: 'Wk 2', bookings: 348 },
      { label: 'Wk 3', bookings: 301 },
      { label: 'Wk 4', bookings: 389 },
      { label: 'Wk 5', bookings: 417 },
      { label: 'Wk 6', bookings: 402 },
      { label: 'Wk 7', bookings: 445 },
      { label: 'Wk 8', bookings: 468 },
    ],
    providerCategories: SERVICE_CATEGORIES.map((category) => ({
      category,
      count: PROVIDER_COUNT_BY_CATEGORY[category],
    })),
    recentRegistrations: [
      { id: 'r1', name: 'Yara Mansour', role: 'CUSTOMER', date: '12 minutes ago' },
      { id: 'r2', name: 'Deema Auto Fix', role: 'PROVIDER', date: '48 minutes ago' },
      { id: 'r3', name: 'Tarek Haddad', role: 'CUSTOMER', date: '2 hours ago' },
      { id: 'r4', name: 'Lina Kassem', role: 'CUSTOMER', date: '3 hours ago' },
      { id: 'r5', name: 'Prime Tire Hub', role: 'PROVIDER', date: '5 hours ago' },
      { id: 'r6', name: 'Sami Boulos', role: 'CUSTOMER', date: 'Yesterday' },
    ],
    recentComplaints: [
      {
        id: 'c1',
        subject: 'Service took much longer than the estimated time',
        submittedBy: 'Rami Sarkis',
        againstProvider: 'Fahed Auto Care',
        severity: 'medium',
        date: '3 hours ago',
      },
      {
        id: 'c2',
        subject: 'Charged more than the quoted price',
        submittedBy: 'Dina Aoun',
        againstProvider: 'Metro Oil Express',
        severity: 'high',
        date: 'Yesterday',
      },
      {
        id: 'c3',
        subject: 'Provider marked booking complete without service',
        submittedBy: 'Hassan Zeidan',
        againstProvider: 'Cedar Tire Works',
        severity: 'high',
        date: '2 days ago',
      },
      {
        id: 'c4',
        subject: 'Requested a receipt but never received one',
        submittedBy: 'Maya Rahal',
        againstProvider: 'Sparkle Car Wash',
        severity: 'low',
        date: '3 days ago',
      },
    ],
    platformHealth: 'operational',
  };
}

export async function fetchAdminOverview(
  mode: 'ready' | 'empty' | 'error' = 'ready',
): Promise<AdminOverviewData> {
  await delay(700);

  if (mode === 'error') {
    throw new Error('Failed to load admin overview');
  }

  const data = buildOverview();

  if (mode === 'empty') {
    return {
      ...data,
      recentRegistrations: [],
      recentComplaints: [],
      summary: { ...data.summary, openComplaints: 0 },
    };
  }

  return data;
}
