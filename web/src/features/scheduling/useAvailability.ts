import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchAvailability } from './schedulingApi';

export function availabilityQueryKey(
  providerId: number | string,
  serviceId: number | null,
  date: string | null,
) {
  return ['availability', providerId, serviceId, date];
}

// Only fetches once both a service and a date are chosen — there is
// nothing meaningful to show before that (the backend requires both).
export function useAvailability(
  providerId: number | string,
  serviceId: number | null,
  date: string | null,
) {
  const query = useQuery({
    queryKey: availabilityQueryKey(providerId, serviceId, date),
    queryFn: () => fetchAvailability(providerId, serviceId as number, date as string),
    enabled: serviceId !== null && Boolean(date),
  });

  return {
    availability: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load availability for this date')
      : null,
    reload: () => query.refetch(),
  };
}

// Used after a 409 conflict on booking creation (someone else took the
// slot first) and by the realtime `provider:availability_changed` socket
// handler — both cases mean "this provider's slot picture may be stale,
// refetch it" rather than a full page reload.
export function useInvalidateAvailability() {
  const queryClient = useQueryClient();
  return (providerId: number | string) =>
    queryClient.invalidateQueries({ queryKey: ['availability', providerId] });
}
