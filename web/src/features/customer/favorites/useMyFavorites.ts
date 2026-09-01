import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchMyFavorites } from './favoritesApi';

export const MY_FAVORITES_KEY = ['favorites', 'me'];

export function useMyFavorites() {
  const query = useQuery({
    queryKey: MY_FAVORITES_KEY,
    queryFn: fetchMyFavorites,
  });

  const favorites = query.data;
  const favoritedProviderIds = useMemo(
    () => new Set((favorites ?? []).map((f) => f.provider.id)),
    [favorites],
  );

  return {
    favorites: favorites ?? [],
    favoritedProviderIds,
    isPending: query.isPending,
    isError: query.isError,
    errorMessage: query.isError
      ? getErrorMessage(query.error, 'Could not load your favorites')
      : null,
    reload: query.refetch,
  };
}
