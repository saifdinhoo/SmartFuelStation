import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { createBooking } from './bookingsApi';
import type { CreateBookingInput } from './types';

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      showToast({ title: 'Booking requested', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not create the booking'),
        variant: 'destructive',
      });
    },
  });

  return {
    createBooking: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
