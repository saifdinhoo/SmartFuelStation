import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchProviders } from './discoveryApi';
import { mapProvider } from './providerHelpers';
import { useGeolocation } from './useGeolocation';

// There's no GET /providers/:id endpoint, so this reads from the same
// ['providers'] query as the search page. If that list is already cached
// (the customer came from Find Services), this resolves instantly with no
// extra network call — otherwise TanStack Query fetches it fresh.
export function useProviderDetails(id: string) {
  const { status: locationStatus, coordinates } = useGeolocation();

  const providersQuery = useQuery({
    queryKey: ['providers'],
    queryFn: fetchProviders,
  });

  const provider = useMemo(() => {
    const raw = providersQuery.data?.find((p) => String(p.id) === id);
    return raw ? mapProvider(raw, coordinates) : undefined;
  }, [providersQuery.data, id, coordinates]);

  const notFound = providersQuery.isSuccess && !provider;

  return {
    provider,
    isPending: providersQuery.isPending,
    isError: providersQuery.isError,
    errorMessage: providersQuery.isError
      ? getErrorMessage(providersQuery.error, 'Could not load this provider')
      : null,
    notFound,
    reload: providersQuery.refetch,
    // The customer's own position, only when it's a real GPS reading —
    // never the demo fallback point pretending to be one. Used as the
    // directions origin; buildDirectionsUrl omits origin entirely when
    // this is null, letting Google Maps ask the device instead.
    customerCoordinates: locationStatus === 'granted' ? coordinates : null,
  };
}
