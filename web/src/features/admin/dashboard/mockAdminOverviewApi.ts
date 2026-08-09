import { SERVICE_CATEGORIES } from '@/features/provider/services/types';
import type { AdminOverviewData, PendingApprovalItem } from './types';

// Backend has no admin reporting/moderation endpoints yet — this whole
// feature is explicitly mock-only until those APIs exist.

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FAILURE_CHANCE = 0.15;

function maybeFail(message: string) {
  if (Math.random() < FAILURE_CHANCE) {
    throw new Error(message);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

let pendingApprovals: PendingApprovalItem[] = [
  {
    id: 'pa1',
    businessName: 'Fahed Auto Care',
    category: 'Oil Change',
    submittedDate: '2 days ago',
  },
  {
    id: 'pa2',
    businessName: 'Cedar Tire Works',
    category: 'Tire Repair',
    submittedDate: '3 days ago',
  },
  {
    id: 'pa3',
    businessName: 'Nour Battery Center',
    category: 'Battery Check',
    submittedDate: '3 days ago',
  },
  {
    id: 'pa4',
    businessName: 'Falcon Brake Specialists',
    category: 'Brake Inspection',
    submittedDate: '5 days ago',
  },
  {
    id: 'pa5',
    businessName: 'Sparkle Car Wash',
    category: 'Car Wash',
    submittedDate: '6 days ago',
  },
  {
    id: 'pa6',
    businessName: 'Horizon General Inspection',
    category: 'General Inspection',
    submittedDate: '1 week ago',
  },
  {
    id: 'pa7',
    businessName: 'Metro Oil Express',
    category: 'Oil Change',
    submittedDate: '1 week ago',
  },
];

const totalCustomers = 1284;
let totalProviders = 192;
const openComplaints = 11;

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
      totalProviders,
      pendingApprovals: pendingApprovals.length,
      activeBookings: 57,
      openComplaints,
      averageRating: 4.5,
    },
    userGrowth: [
      { label: 'Feb', customers: 780, providers: 96 },
      { label: 'Mar', customers: 860, providers: 112 },
      { label: 'Apr', customers: 945, providers: 128 },
      { label: 'May', customers: 1040, providers: 149 },
      { label: 'Jun', customers: 1160, providers: 171 },
      { label: 'Jul', customers: totalCustomers, providers: totalProviders },
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
    pendingApprovals: clone(pendingApprovals),
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
      pendingApprovals: [],
      summary: { ...data.summary, pendingApprovals: 0, openComplaints: 0 },
    };
  }

  return data;
}

export async function approveProvider(id: string): Promise<void> {
  await delay(500);
  maybeFail('Failed to approve provider');
  pendingApprovals = pendingApprovals.filter((item) => item.id !== id);
  totalProviders += 1;
}

export async function rejectProvider(id: string): Promise<void> {
  await delay(500);
  maybeFail('Failed to reject provider');
  pendingApprovals = pendingApprovals.filter((item) => item.id !== id);
}
