import { useCallback, useEffect, useState } from 'react';
import { fetchNearbyProviders } from './mockDiscoveryApi';
import { useGeolocation } from './useGeolocation';
import type { DiscoveredProvider, SortOption } from './types';

export type DiscoveryViewState = 'loading' | 'ready' | 'error';

export function useProviderDiscovery() {
  const { status: locationStatus, coordinates, retry: retryLocation } = useGeolocation();

  const [providers, setProviders] = useState<DiscoveredProvider[]>([]);
  const [viewState, setViewState] = useState<DiscoveryViewState>('loading');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<SortOption>('distance');
  const [openNowOnly, setOpenNowOnly] = useState(false);

  const load = useCallback(async () => {
    setViewState('loading');
    try {
      const result = await fetchNearbyProviders(coordinates, {
        search,
        category,
        sort,
        openNowOnly,
      });
      setProviders(result);
      setViewState('ready');
    } catch {
      setViewState('error');
    }
  }, [coordinates, search, category, sort, openNowOnly]);

  useEffect(() => {
    // Refetch whenever the location settles or a filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return {
    providers,
    viewState,
    locationStatus,
    retryLocation,
    search,
    setSearch,
    category,
    setCategory,
    sort,
    setSort,
    openNowOnly,
    setOpenNowOnly,
    reload: load,
    simulateEmpty: () => {
      setViewState('ready');
      setProviders([]);
    },
  };
}
