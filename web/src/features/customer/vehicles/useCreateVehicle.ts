import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { createVehicle } from './vehiclesApi';
import { MY_VEHICLES_KEY } from './useMyVehicles';
import type { VehicleFormValues } from './types';

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (input: VehicleFormValues) => createVehicle(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_VEHICLES_KEY });
      showToast({ title: 'Vehicle added', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not add the vehicle'),
        variant: 'destructive',
      });
    },
  });

  return {
    createVehicle: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
