import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchOwnFuel, fetchProviderFuel, fetchProviderFuelHistory } from './fuelApi';
import type { FuelHistoryRange, FuelType } from './types';

// Provider's own read — GET /providers/me/fuel.
export function useOwnFuel() {
  const query = useQuery({ queryKey: ['fuel', 'me'], queryFn: fetchOwnFuel });

  return {
    fuel: query.data,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load your fuel inventory')
      : null,
  };
}

// Public/customer read — GET /providers/:id/fuel. Undefined while the
// provider id isn't known yet.
export function useProviderFuel(providerId: number | string | undefined) {
  const query = useQuery({
    queryKey: ['fuel', providerId],
    queryFn: () => fetchProviderFuel(providerId as number | string),
    enabled: providerId !== undefined,
  });

  return {
    fuel: query.data,
    isPending: query.isPending,
    isError: query.isError,
  };
}

export function useProviderFuelHistory(
  providerId: number | string | undefined,
  fuelType: FuelType | undefined,
  range: FuelHistoryRange,
) {
  const query = useQuery({
    queryKey: ['fuelHistory', providerId, fuelType, range],
    queryFn: () => fetchProviderFuelHistory(providerId as number | string, { fuelType, range }),
    enabled: providerId !== undefined && fuelType !== undefined,
  });

  return {
    history: query.data,
    isPending: query.isPending,
    isError: query.isError,
  };
}

// Used after the `provider:fuel_updated` socket event and is a no-op if
// nothing is cached for this provider yet.
export function useInvalidateFuel() {
  const queryClient = useQueryClient();
  return (providerId: number | string) => {
    queryClient.invalidateQueries({ queryKey: ['fuel', providerId] });
    queryClient.invalidateQueries({ queryKey: ['fuelHistory', providerId] });
  };
}
