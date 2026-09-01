import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchMyVehicles } from './vehiclesApi';

export const MY_VEHICLES_KEY = ['vehicles', 'me'];

export function useMyVehicles() {
  const query = useQuery({ queryKey: MY_VEHICLES_KEY, queryFn: fetchMyVehicles });

  return {
    vehicles: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load your vehicles')
      : null,
    reload: query.refetch,
  };
}
