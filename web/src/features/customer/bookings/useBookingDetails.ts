import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchBookingById } from './bookingsApi';

export function useBookingDetails(id: string) {
  const query = useQuery({
    queryKey: ['bookings', id],
    queryFn: () => fetchBookingById(id),
    enabled: Boolean(id),
  });

  return {
    booking: query.data,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load this booking')
      : null,
    reload: query.refetch,
  };
}
