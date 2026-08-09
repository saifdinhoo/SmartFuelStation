import { useCallback, useEffect, useState } from 'react';
import { fetchProviderDetails } from './mockDiscoveryApi';
import { useGeolocation } from './useGeolocation';
import type { ProviderDetails } from './types';

export type ProviderDetailsViewState = 'loading' | 'ready' | 'error';

export function useProviderDetails(providerId: string) {
  const { coordinates } = useGeolocation();
  const [details, setDetails] = useState<ProviderDetails | null>(null);
  const [viewState, setViewState] = useState<ProviderDetailsViewState>('loading');

  const load = useCallback(async () => {
    setViewState('loading');
    try {
      const result = await fetchProviderDetails(providerId, coordinates);
      setDetails(result);
      setViewState('ready');
    } catch {
      setViewState('error');
    }
  }, [providerId, coordinates]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { details, viewState, reload: load };
}
