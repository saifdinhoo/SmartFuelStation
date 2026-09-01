import { Heart } from 'lucide-react';
import { useMyFavorites } from './useMyFavorites';
import { useToggleFavorite } from './useToggleFavorite';

interface FavoriteButtonProps {
  providerId: number;
}

// Real, shared, persisted state — GET /favorites/me is the single source
// of truth every instance of this button reads from, so favoriting a
// provider on the discovery list and viewing it on Provider Details (or
// the Favorites page) always agree, and the same state survives a refresh
// and shows up on another device after refetch.
export function FavoriteButton({ providerId }: FavoriteButtonProps) {
  const { favoritedProviderIds, isPending: isLoadingFavorites } = useMyFavorites();
  const { toggleFavorite, isPending: isToggling } = useToggleFavorite();
  const isFavorite = favoritedProviderIds.has(providerId);

  return (
    <button
      type="button"
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={isFavorite}
      disabled={isLoadingFavorites || isToggling}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite({ providerId, isFavorite });
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
    </button>
  );
}
