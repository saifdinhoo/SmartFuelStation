// The one place every "open an external map" URL is built — nothing else
// in the app should construct a maps.google.com URL by hand. Two distinct
// actions, matching the project-wide UX rule:
//   - "View/Preview location": a pin at a fixed point, never modifies data.
//   - "Get directions": customer -> destination, origin omitted when the
//     customer's own position isn't known (Google Maps then asks the
//     browser/app for it instead of us guessing).

export interface Coordinates {
  lat: number;
  lng: number;
}

export function isValidLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function hasValidCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  return lat !== null && lat !== undefined && lng !== null && lng !== undefined
    ? isValidLatitude(lat) && isValidLongitude(lng)
    : false;
}

// A pin at the given point — never a route, never modifies anything. Falls
// back to a text search on the raw address when no valid coordinates exist
// yet, so "View location" stays useful even before a provider has set
// precise coordinates.
export function buildViewLocationUrl(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  addressFallback?: string | null,
): string | null {
  if (hasValidCoordinates(latitude, longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  if (addressFallback && addressFallback.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressFallback.trim())}`;
  }
  return null;
}

// Customer -> provider. Destination coordinates are required (a business
// with no set location has nowhere to route to); origin is optional — when
// omitted, Google Maps determines it from the device opening the link.
export function buildDirectionsUrl(
  destinationLatitude: number | null | undefined,
  destinationLongitude: number | null | undefined,
  origin?: Coordinates | null,
): string | null {
  if (!hasValidCoordinates(destinationLatitude, destinationLongitude)) return null;
  const destination = `${destinationLatitude},${destinationLongitude}`;
  if (origin && isValidLatitude(origin.lat) && isValidLongitude(origin.lng)) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function openExternalUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
