import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { addFavorite, removeFavorite } from './favoritesApi';
import { MY_FAVORITES_KEY } from './useMyFavorites';

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({
      providerId,
      isFavorite,
    }: {
      providerId: number;
      isFavorite: boolean;
    }): Promise<void> => {
      if (isFavorite) {
        await removeFavorite(providerId);
      } else {
        await addFavorite(providerId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_FAVORITES_KEY });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not update your favorites'),
        variant: 'destructive',
      });
    },
  });

  return {
    toggleFavorite: mutation.mutate,
    isPending: mutation.isPending,
  };
}
