import type { ServiceCategory } from '@/features/provider/services/types';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DiscoveredProvider {
  id: string;
  businessName: string;
  category: ServiceCategory;
  address: string;
  coordinates: Coordinates;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  priceTo: number;
  estimatedWaitMinutes: number;
  isOpenNow: boolean;
}

export interface ProviderService {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface ProviderReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ProviderDetails extends DiscoveredProvider {
  description: string;
  services: ProviderService[];
  reviews: ProviderReview[];
}

export type SortOption = 'distance' | 'rating' | 'price';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'distance', label: 'Nearest first' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price', label: 'Lowest price' },
];
