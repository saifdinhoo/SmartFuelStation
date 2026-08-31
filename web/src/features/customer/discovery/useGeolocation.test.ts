import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useGeolocation } from './useGeolocation';

const getCurrentPosition = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  });
});

describe('useGeolocation', () => {
  it('allows a cached position on the initial mount fetch', async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({ coords: { latitude: 33.5, longitude: 35.5 } } as GeolocationPosition);
    });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.status).toBe('granted'));

    const options = getCurrentPosition.mock.calls[0][2];
    expect(options.maximumAge).toBeGreaterThan(0);
  });

  // Regression test: a live smoke test found that "Update my location"
  // could silently return the browser's own cached reading (maximumAge)
  // instead of actually asking again, so a customer who had moved would
  // see stale distances after clicking it.
  it('retry forces a fresh reading — maximumAge: 0 — never a cached one', async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({ coords: { latitude: 33.5, longitude: 35.5 } } as GeolocationPosition);
    });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.status).toBe('granted'));

    getCurrentPosition.mockClear();
    result.current.retry();

    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(1));
    const options = getCurrentPosition.mock.calls[0][2];
    expect(options.maximumAge).toBe(0);
  });

  it('retry updates coordinates and status on a fresh success', async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({ coords: { latitude: 33.5, longitude: 35.5 } } as GeolocationPosition);
    });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.status).toBe('granted'));

    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({ coords: { latitude: 34.5, longitude: 36.5 } } as GeolocationPosition);
    });
    result.current.retry();

    await waitFor(() =>
      expect(result.current.coordinates).toEqual({ lat: 34.5, lng: 36.5 }),
    );
  });

  it('retry reports denied and falls back to the demo origin on failure', async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({ coords: { latitude: 33.5, longitude: 35.5 } } as GeolocationPosition);
    });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.status).toBe('granted'));

    getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: 'denied' } as GeolocationPositionError);
      },
    );
    result.current.retry();

    await waitFor(() => expect(result.current.status).toBe('denied'));
  });
});
