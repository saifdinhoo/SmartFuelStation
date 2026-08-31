export interface Coordinates {
  lat: number;
  lng: number;
}

// Raw shapes exactly as the backend returns them (Decimal fields serialize
// as strings). Never used directly by components — always mapped first.
export interface RawCategory {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface RawProviderService {
  id: number;
  name: string;
  price: string;
  durationMinutes: number;
  isAvailable: boolean;
  category: { id: number; name: string };
}

export interface RawProvider {
  id: number;
  businessName: string;
  address: string;
  description: string | null;
  isApproved: boolean;
  isOpen: boolean;
  latitude: string | null;
  longitude: string | null;
  estimatedWaitMinutes: number;
  createdAt: string;
  updatedAt: string;
  services: RawProviderService[];
  _count: { reviews: number; queueEntries: number };
  // Phase F — whether this business has an authorized live camera at all.
  // Non-sensitive (mirrors isOpen); the real stream address/credentials
  // never appear here or anywhere else in this response.
  liveCameraEnabled: boolean;
}

// Display-ready shapes, after parsing + distance computation.
export interface ProviderServiceItem {
  id: number;
  name: string;
  price: number;
  durationMinutes: number;
  isAvailable: boolean;
  category: { id: number; name: string };
}

export interface Provider {
  id: number;
  businessName: string;
  address: string;
  description: string | null;
  isOpen: boolean;
  latitude: number | null;
  longitude: number | null;
  estimatedWaitMinutes: number;
  services: ProviderServiceItem[];
  reviewCount: number;
  distanceKm: number | null;
  // From GET /providers/:id/rating-summary — undefined while that request
  // is still in flight, null once loaded if the provider has no reviews.
  averageRating: number | null | undefined;
  liveCameraEnabled: boolean;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

// GET /providers/:id/rating-summary — computed server-side via Prisma
// aggregation. Never fabricated on the frontend.
export interface RatingSummary {
  averageRating: number | null;
  reviewCount: number;
}

// GET /providers/:id/reviews
export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: { id: number; name: string };
}

export type SortOption = 'distance' | 'price' | 'rating';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'distance', label: 'Nearest first' },
  { value: 'price', label: 'Lowest price' },
  { value: 'rating', label: 'Highest rated' },
];
