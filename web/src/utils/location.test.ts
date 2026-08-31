import { describe, expect, it } from 'vitest';
import {
  buildDirectionsUrl,
  buildViewLocationUrl,
  hasValidCoordinates,
  isValidLatitude,
  isValidLongitude,
} from './location';

describe('coordinate validation', () => {
  it('accepts values within the real range', () => {
    expect(isValidLatitude(0)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
  });

  it('rejects out-of-range, non-numeric, and non-finite values', () => {
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLatitude(-91)).toBe(false);
    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLongitude(-181)).toBe(false);
    expect(isValidLatitude(NaN)).toBe(false);
    expect(isValidLatitude(Infinity)).toBe(false);
    expect(isValidLatitude('33.5' as unknown as number)).toBe(false);
  });

  it('hasValidCoordinates requires both to be present and valid', () => {
    expect(hasValidCoordinates(33.5, 35.5)).toBe(true);
    expect(hasValidCoordinates(null, 35.5)).toBe(false);
    expect(hasValidCoordinates(33.5, undefined)).toBe(false);
    expect(hasValidCoordinates(200, 35.5)).toBe(false);
  });
});

describe('buildViewLocationUrl', () => {
  it('builds a pin URL from valid coordinates', () => {
    expect(buildViewLocationUrl(33.8938, 35.5018)).toBe(
      'https://www.google.com/maps/search/?api=1&query=33.8938,35.5018',
    );
  });

  it('falls back to an address text search when coordinates are missing', () => {
    expect(buildViewLocationUrl(null, null, 'Hamra Street, Beirut')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Hamra%20Street%2C%20Beirut',
    );
  });

  it('returns null for malformed coordinates and no address fallback — never a broken URL', () => {
    expect(buildViewLocationUrl(200, 35.5)).toBeNull();
    expect(buildViewLocationUrl(null, null)).toBeNull();
    expect(buildViewLocationUrl(null, null, '')).toBeNull();
    expect(buildViewLocationUrl(null, null, '   ')).toBeNull();
  });

  it('prefers coordinates over the address fallback when both are present', () => {
    expect(buildViewLocationUrl(33.5, 35.5, 'Somewhere')).toContain('33.5,35.5');
  });
});

describe('buildDirectionsUrl', () => {
  it('builds a destination-only URL when no origin is known', () => {
    expect(buildDirectionsUrl(33.8938, 35.5018)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=33.8938,35.5018',
    );
  });

  it('includes the customer origin when available', () => {
    expect(buildDirectionsUrl(33.8938, 35.5018, { lat: 33.89, lng: 35.5 })).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=33.89,35.5&destination=33.8938,35.5018',
    );
  });

  it('returns null when the destination is missing or invalid, regardless of origin', () => {
    expect(buildDirectionsUrl(null, null)).toBeNull();
    expect(buildDirectionsUrl(200, 35.5, { lat: 33.89, lng: 35.5 })).toBeNull();
  });

  it('ignores an invalid origin rather than building a malformed URL', () => {
    expect(buildDirectionsUrl(33.8938, 35.5018, { lat: 999, lng: 35.5 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=33.8938,35.5018',
    );
  });
});
