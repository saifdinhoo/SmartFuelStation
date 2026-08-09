import { useCallback, useEffect, useState } from 'react';
import type { Coordinates } from './types';
import { DEMO_ORIGIN } from './mockDiscoveryApi';

export type GeolocationStatus = 'locating' | 'granted' | 'denied' | 'unsupported';

export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>('locating');
  const [coordinates, setCoordinates] = useState<Coordinates>(DEMO_ORIGIN);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus('granted');
      },
      () => {
        setCoordinates(DEMO_ORIGIN);
        setStatus('denied');
      },
      { timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    // Ask for the device's location once, on mount — the canonical effect
    // use case. Falls back to a fixed demo location on denial/timeout so
    // the page always has something sensible to show.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    requestLocation();
  }, [requestLocation]);

  return { status, coordinates, retry: requestLocation };
}
