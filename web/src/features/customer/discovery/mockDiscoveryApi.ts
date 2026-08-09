import { SERVICE_CATEGORIES } from '@/features/provider/services/types';
import type {
  Coordinates,
  DiscoveredProvider,
  ProviderDetails,
  ProviderReview,
  ProviderService,
  SortOption,
} from './types';

// The real GET /providers endpoint returns businessName/address/description
// only — no coordinates, prices, ratings, or wait times. None of that exists
// in the backend yet, so this whole feature is mock-only until those fields
// (and a real bookings/reviews API) exist.

// Beirut is used as the fallback "demo" location when GPS is denied or
// unavailable, matching the Arabic/English bilingual context of the rest of
// the app's mock data.
export const DEMO_ORIGIN: Coordinates = { lat: 33.8938, lng: 35.5018 };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FAILURE_CHANCE = 0.15;

function maybeFail(message: string) {
  if (Math.random() < FAILURE_CHANCE) {
    throw new Error(message);
  }
}

function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

interface ProviderSeed {
  id: string;
  businessName: string;
  category: (typeof SERVICE_CATEGORIES)[number];
  address: string;
  coordinates: Coordinates;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  priceTo: number;
  estimatedWaitMinutes: number;
  isOpenNow: boolean;
  description: string;
}

const PROVIDERS: ProviderSeed[] = [
  {
    id: 'p1',
    businessName: 'Cedars Quick Lube',
    category: 'Oil Change',
    address: 'Hamra Street, Beirut',
    coordinates: { lat: 33.8959, lng: 35.4826 },
    rating: 4.7,
    reviewCount: 132,
    priceFrom: 18,
    priceTo: 35,
    estimatedWaitMinutes: 10,
    isOpenNow: true,
    description: 'Fast, no-appointment oil changes with a 15-minute promise on most vehicles.',
  },
  {
    id: 'p2',
    businessName: 'Beirut Tire Depot',
    category: 'Tire Repair',
    address: 'Sin El Fil, Beirut',
    coordinates: { lat: 33.8797, lng: 35.5423 },
    rating: 4.4,
    reviewCount: 89,
    priceFrom: 10,
    priceTo: 60,
    estimatedWaitMinutes: 25,
    isOpenNow: true,
    description: 'Full tire service: patching, rotation, balancing, and new-tire fitting.',
  },
  {
    id: 'p3',
    businessName: 'Volt Battery Care',
    category: 'Battery Check',
    address: 'Achrafieh, Beirut',
    coordinates: { lat: 33.8886, lng: 35.5165 },
    rating: 4.6,
    reviewCount: 54,
    priceFrom: 5,
    priceTo: 90,
    estimatedWaitMinutes: 15,
    isOpenNow: true,
    description: 'Free battery health checks, on-the-spot testing and replacement.',
  },
  {
    id: 'p4',
    businessName: 'SafeStop Brake Center',
    category: 'Brake Inspection',
    address: 'Furn El Chebbak, Beirut',
    coordinates: { lat: 33.8657, lng: 35.5215 },
    rating: 4.8,
    reviewCount: 201,
    priceFrom: 20,
    priceTo: 120,
    estimatedWaitMinutes: 40,
    isOpenNow: false,
    description: 'Certified brake specialists — pads, rotors, and full safety inspections.',
  },
  {
    id: 'p5',
    businessName: 'Sparkle Car Spa',
    category: 'Car Wash',
    address: 'Verdun, Beirut',
    coordinates: { lat: 33.8869, lng: 35.4788 },
    rating: 4.3,
    reviewCount: 176,
    priceFrom: 8,
    priceTo: 40,
    estimatedWaitMinutes: 20,
    isOpenNow: true,
    description: 'Exterior, interior, and full detailing packages with eco-friendly products.',
  },
  {
    id: 'p6',
    businessName: 'Horizon Full Inspection',
    category: 'General Inspection',
    address: 'Dora, Beirut',
    coordinates: { lat: 33.9106, lng: 35.5514 },
    rating: 4.5,
    reviewCount: 63,
    priceFrom: 25,
    priceTo: 55,
    estimatedWaitMinutes: 30,
    isOpenNow: true,
    description: 'Comprehensive multi-point inspection reports before long trips or resale.',
  },
  {
    id: 'p7',
    businessName: 'Metro Express Lube',
    category: 'Oil Change',
    address: 'Jal el Dib, Beirut',
    coordinates: { lat: 33.9271, lng: 35.5865 },
    rating: 4.1,
    reviewCount: 41,
    priceFrom: 15,
    priceTo: 30,
    estimatedWaitMinutes: 8,
    isOpenNow: true,
    description: 'Budget-friendly oil and filter changes, drive-through style.',
  },
  {
    id: 'p8',
    businessName: 'Falcon Tire Works',
    category: 'Tire Repair',
    address: 'Baabda',
    coordinates: { lat: 33.8342, lng: 35.5434 },
    rating: 4.2,
    reviewCount: 58,
    priceFrom: 12,
    priceTo: 65,
    estimatedWaitMinutes: 35,
    isOpenNow: false,
    description: 'Full tire replacement and alignment for passenger and light trucks.',
  },
  {
    id: 'p9',
    businessName: 'PowerCell Batteries',
    category: 'Battery Check',
    address: 'Antelias',
    coordinates: { lat: 33.9214, lng: 35.6156 },
    rating: 4.0,
    reviewCount: 22,
    priceFrom: 6,
    priceTo: 85,
    estimatedWaitMinutes: 12,
    isOpenNow: true,
    description: 'Same-day battery replacement with a 2-year warranty on all units.',
  },
  {
    id: 'p10',
    businessName: 'Precision Brake & Suspension',
    category: 'Brake Inspection',
    address: 'Jounieh',
    coordinates: { lat: 33.9808, lng: 35.6178 },
    rating: 4.9,
    reviewCount: 147,
    priceFrom: 22,
    priceTo: 130,
    estimatedWaitMinutes: 45,
    isOpenNow: true,
    description: 'Premium brake and suspension work with a lifetime pad-wear guarantee.',
  },
  {
    id: 'p11',
    businessName: 'Riviera Hand Wash',
    category: 'Car Wash',
    address: 'Raouche, Beirut',
    coordinates: { lat: 33.8916, lng: 35.4692 },
    rating: 4.6,
    reviewCount: 98,
    priceFrom: 10,
    priceTo: 45,
    estimatedWaitMinutes: 18,
    isOpenNow: true,
    description: 'Seaside hand wash and detailing with a lounge while you wait.',
  },
  {
    id: 'p12',
    businessName: 'CheckPoint Vehicle Inspection',
    category: 'General Inspection',
    address: 'Zalka',
    coordinates: { lat: 33.9026, lng: 35.5776 },
    rating: 3.9,
    reviewCount: 17,
    priceFrom: 20,
    priceTo: 50,
    estimatedWaitMinutes: 22,
    isOpenNow: false,
    description: 'Government-standard inspection reports, walk-ins welcome.',
  },
];

const SAMPLE_REVIEWS: Omit<ProviderReview, 'id'>[] = [
  {
    customerName: 'Layla Hassan',
    rating: 5,
    comment: 'Quick and honest, no upselling.',
    date: '3 days ago',
  },
  {
    customerName: 'Omar Saeed',
    rating: 4,
    comment: 'Good work, slightly longer wait than quoted.',
    date: '1 week ago',
  },
  {
    customerName: 'Nadia Kareem',
    rating: 5,
    comment: 'Explained everything clearly before starting.',
    date: '2 weeks ago',
  },
  {
    customerName: 'Yousef Ali',
    rating: 4,
    comment: 'Fair pricing and friendly staff.',
    date: '3 weeks ago',
  },
];

function buildServices(seed: ProviderSeed): ProviderService[] {
  const span = seed.priceTo - seed.priceFrom;
  return [
    { id: `${seed.id}-s1`, name: seed.category, price: seed.priceFrom, durationMinutes: 20 },
    {
      id: `${seed.id}-s2`,
      name: `${seed.category} — Premium`,
      price: Math.round(seed.priceFrom + span * 0.6),
      durationMinutes: 45,
    },
  ];
}

export async function fetchNearbyProviders(
  origin: Coordinates,
  filters: { search: string; category: string | 'all'; sort: SortOption; openNowOnly: boolean },
): Promise<DiscoveredProvider[]> {
  await delay(600);
  maybeFail('Failed to load nearby providers');

  let results: DiscoveredProvider[] = PROVIDERS.map((seed) => ({
    id: seed.id,
    businessName: seed.businessName,
    category: seed.category,
    address: seed.address,
    coordinates: seed.coordinates,
    distanceKm: Math.round(haversineKm(origin, seed.coordinates) * 10) / 10,
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    priceFrom: seed.priceFrom,
    priceTo: seed.priceTo,
    estimatedWaitMinutes: seed.estimatedWaitMinutes,
    isOpenNow: seed.isOpenNow,
  }));

  if (filters.search.trim()) {
    const term = filters.search.trim().toLowerCase();
    results = results.filter(
      (p) => p.businessName.toLowerCase().includes(term) || p.category.toLowerCase().includes(term),
    );
  }
  if (filters.category !== 'all') {
    results = results.filter((p) => p.category === filters.category);
  }
  if (filters.openNowOnly) {
    results = results.filter((p) => p.isOpenNow);
  }

  results.sort((a, b) => {
    if (filters.sort === 'distance') return a.distanceKm - b.distanceKm;
    if (filters.sort === 'rating') return b.rating - a.rating;
    return a.priceFrom - b.priceFrom;
  });

  return results;
}

export async function fetchProviderDetails(
  id: string,
  origin: Coordinates,
): Promise<ProviderDetails> {
  await delay(500);
  maybeFail('Failed to load provider details');

  const seed = PROVIDERS.find((p) => p.id === id);
  if (!seed) {
    throw new Error('Provider not found');
  }

  return {
    id: seed.id,
    businessName: seed.businessName,
    category: seed.category,
    address: seed.address,
    coordinates: seed.coordinates,
    distanceKm: Math.round(haversineKm(origin, seed.coordinates) * 10) / 10,
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    priceFrom: seed.priceFrom,
    priceTo: seed.priceTo,
    estimatedWaitMinutes: seed.estimatedWaitMinutes,
    isOpenNow: seed.isOpenNow,
    description: seed.description,
    services: buildServices(seed),
    reviews: SAMPLE_REVIEWS.map((review, index) => ({ ...review, id: `${seed.id}-r${index}` })),
  };
}
