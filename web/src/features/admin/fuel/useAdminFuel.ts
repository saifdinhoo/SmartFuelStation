import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  fetchAdminFuel,
  fetchAdminFuelHistory,
  updateAdminFuel,
  type FuelWriteInput,
} from '@/features/fuel/fuelApi';
import type { FuelHistoryRange, FuelType } from '@/features/fuel/types';

export function useAdminFuel(providerId: number | undefined) {
  const query = useQuery({
    queryKey: ['adminFuel', providerId],
    queryFn: () => fetchAdminFuel(providerId as number),
    enabled: providerId !== undefined,
  });

  return {
    fuel: query.data,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load this provider\'s fuel inventory')
      : null,
    reload: () => query.refetch(),
  };
}

export function useAdminFuelHistory(providerId: number | undefined, range: FuelHistoryRange) {
  const query = useQuery({
    queryKey: ['adminFuelHistory', providerId, range],
    queryFn: () => fetchAdminFuelHistory(providerId as number, { range }),
    enabled: providerId !== undefined,
  });

  return { history: query.data, isPending: query.isPending, isError: query.isError };
}

export function useUpdateAdminFuel(providerId: number | undefined) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: ({ fuelType, input }: { fuelType: FuelType; input: FuelWriteInput }) =>
      updateAdminFuel(providerId as number, fuelType, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFuel', providerId] });
      queryClient.invalidateQueries({ queryKey: ['adminFuelHistory', providerId] });
      // Public/provider-own reads of the same data.
      queryClient.invalidateQueries({ queryKey: ['fuel', providerId] });
      queryClient.invalidateQueries({ queryKey: ['fuelHistory', providerId] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'me'] });
      showToast({ title: 'Fuel inventory updated', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not update this fuel inventory'),
        variant: 'destructive',
      });
    },
  });

  return {
    save: (fuelType: FuelType, input: FuelWriteInput) => mutation.mutateAsync({ fuelType, input }),
    isSaving: mutation.isPending,
  };
}
