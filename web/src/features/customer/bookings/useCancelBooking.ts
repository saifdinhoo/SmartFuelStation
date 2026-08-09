import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { updateBookingStatus } from './bookingsApi';

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (id: number) => updateBookingStatus(id, 'CANCELLED'),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', String(id)] });
      showToast({ title: 'Booking cancelled', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not cancel the booking'),
        variant: 'destructive',
      });
    },
  });

  return {
    cancelBooking: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
