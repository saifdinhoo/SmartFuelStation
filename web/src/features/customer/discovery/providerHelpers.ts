import type { Coordinates, Provider, ProviderServiceItem, RawProvider } from './types';

function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

// Maps the raw backend response (Decimal fields as strings) into the
// display shape, computing distance from the customer's current
// coordinates. Providers without stored coordinates get distanceKm: null
// rather than a fabricated number.
//
// averageRating is passed in separately because it comes from a different
// endpoint (GET /providers/:id/rating-summary) than the provider list
// itself — undefined while that per-provider request is still pending.
export function mapProvider(
  raw: RawProvider,
  origin: Coordinates,
  averageRating: number | null | undefined = undefined,
): Provider {
  const latitude = raw.latitude !== null ? parseFloat(raw.latitude) : null;
  const longitude = raw.longitude !== null ? parseFloat(raw.longitude) : null;

  return {
    id: raw.id,
    businessName: raw.businessName,
    address: raw.address,
    description: raw.description,
    isOpen: raw.isOpen,
    latitude,
    longitude,
    estimatedWaitMinutes: raw.estimatedWaitMinutes,
    services: raw.services.map((s) => ({
      id: s.id,
      name: s.name,
      price: parseFloat(s.price),
      durationMinutes: s.durationMinutes,
      isAvailable: s.isAvailable,
      category: s.category,
    })),
    reviewCount: raw._count.reviews,
    averageRating,
    distanceKm:
      latitude !== null && longitude !== null
        ? Math.round(haversineKm(origin, { lat: latitude, lng: longitude }) * 10) / 10
        : null,
  };
}

export function getPriceRange(
  services: ProviderServiceItem[],
): { min: number; max: number } | null {
  if (services.length === 0) return null;
  const prices = services.map((s) => s.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function getDistinctCategories(services: ProviderServiceItem[]): string[] {
  return [...new Set(services.map((s) => s.category.name))];
}
