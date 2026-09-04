import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchBookingPolicy, updateBookingPolicy } from './bookingPolicyApi';
import type { BookingPolicyInput } from './types';

export function useBookingPolicy() {
  const query = useQuery({
    queryKey: ['adminBookingPolicy'],
    queryFn: fetchBookingPolicy,
  });

  return {
    policy: query.data,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError ? getErrorMessage(query.error, 'Could not load the booking policy') : null,
  };
}

export function useUpdateBookingPolicy() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (input: BookingPolicyInput) => updateBookingPolicy(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(['adminBookingPolicy'], updated);
      showToast({ title: 'Booking policy updated', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not update the booking policy'),
        variant: 'destructive',
      });
    },
  });

  return {
    save: (input: BookingPolicyInput) => mutation.mutateAsync(input),
    isSaving: mutation.isPending,
  };
}
