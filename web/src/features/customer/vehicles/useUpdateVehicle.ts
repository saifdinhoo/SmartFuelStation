import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { updateVehicle } from './vehiclesApi';
import { MY_VEHICLES_KEY } from './useMyVehicles';
import type { VehicleFormValues } from './types';

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: VehicleFormValues }) =>
      updateVehicle(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_VEHICLES_KEY });
      showToast({ title: 'Vehicle updated', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not update the vehicle'),
        variant: 'destructive',
      });
    },
  });

  return {
    updateVehicle: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
