import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthProvider';
import { fetchOwnProviderServices } from './queueApi';

export function useOwnProviderServices() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['own-provider-services', user?.id],
    queryFn: () => fetchOwnProviderServices(user!.id),
    enabled: !!user,
  });

  return {
    services: query.data ?? [],
    isPending: query.isPending,
  };
}
