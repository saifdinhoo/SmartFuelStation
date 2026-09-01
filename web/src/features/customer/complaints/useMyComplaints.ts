import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchMyComplaints } from './complaintsApi';

export const MY_COMPLAINTS_KEY = ['complaints', 'me'];

export function useMyComplaints() {
  const query = useQuery({
    queryKey: MY_COMPLAINTS_KEY,
    queryFn: fetchMyComplaints,
  });

  return {
    complaints: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load your complaints')
      : null,
    reload: query.refetch,
  };
}
