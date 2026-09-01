import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMyFavorites } from './useMyFavorites';
import { FavoriteButton } from './FavoriteButton';

export function FavoritesPage() {
  const navigate = useNavigate();
  const { favorites, isPending, isError, errorMessage, reload } = useMyFavorites();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Favorites</h1>
        <p className="text-body-sm text-muted-foreground">Businesses you've saved.</p>
      </div>

      {isError && (
        <ErrorState onRetry={reload} description={errorMessage ?? 'Could not load your favorites.'} />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}

      {!isError && !isPending && favorites.length === 0 && (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          description="Save a business from its page to find it here later."
        />
      )}

      {!isError && !isPending && favorites.length > 0 && (
        <Reveal className="flex flex-col gap-3">
          {favorites.map((favorite) => (
            <Card key={favorite.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-foreground">{favorite.provider.businessName}</p>
                  <p className="text-body-sm text-muted-foreground">{favorite.provider.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator
                    variant={favorite.provider.isOpen ? 'success' : 'neutral'}
                    label={favorite.provider.isOpen ? 'Open now' : 'Closed'}
                  />
                  <FavoriteButton providerId={favorite.provider.id} />
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/customer/providers/${favorite.provider.id}`)}
                  >
                    View details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </Reveal>
      )}
    </div>
  );
}
