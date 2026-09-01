import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { deleteVehicle } from './vehiclesApi';
import { MY_VEHICLES_KEY } from './useMyVehicles';

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (id: number) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_VEHICLES_KEY });
      showToast({ title: 'Vehicle removed', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not remove the vehicle'),
        variant: 'destructive',
      });
    },
  });

  return {
    deleteVehicle: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
