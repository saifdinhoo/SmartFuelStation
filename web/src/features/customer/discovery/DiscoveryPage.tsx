import { MapPin, RefreshCw } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useNearbyProviders } from './useNearbyProviders';
import { DiscoveryFilters } from './DiscoveryFilters';
import { ProviderCard } from './ProviderCard';

export function DiscoveryPage() {
  const {
    providers,
    categories,
    isPending,
    isError,
    errorMessage,
    reload,
    locationStatus,
    retryLocation,
    search,
    setSearch,
    categoryId,
    setCategoryId,
    sort,
    setSort,
    openNowOnly,
    setOpenNowOnly,
  } = useNearbyProviders();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-heading-2">Find Services</h1>
          <p className="text-body-sm text-muted-foreground">
            Automotive shops near you, sorted by distance or price.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={retryLocation}
            isLoading={locationStatus === 'locating'}
          >
            <MapPin className="h-4 w-4" />
            Update my location
          </Button>
          <Button variant="ghost" className="h-9 w-9 p-0" onClick={reload} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(locationStatus === 'denied' || locationStatus === 'unsupported') && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {locationStatus === 'denied'
              ? 'Location access was denied — showing results near a default location instead.'
              : "This browser doesn't support location — showing results near a default location instead."}
          </p>
          {locationStatus === 'denied' && (
            <Button variant="ghost" onClick={retryLocation}>
              Enable location
            </Button>
          )}
        </div>
      )}

      <DiscoveryFilters
        search={search}
        onSearchChange={setSearch}
        categories={categories}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        sort={sort}
        onSortChange={setSort}
        openNowOnly={openNowOnly}
        onOpenNowOnlyChange={setOpenNowOnly}
      />

      {isError && (
        <ErrorState
          onRetry={reload}
          description={errorMessage ?? 'Could not load nearby providers.'}
        />
      )}

      {!isError && isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      )}

      {!isError && !isPending && providers.length === 0 && (
        <EmptyState
          title="No providers match your filters"
          description='Try a different search term, category, or turn off "Open now".'
        />
      )}

      {!isError && !isPending && providers.length > 0 && (
        <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </Reveal>
      )}
    </div>
  );
}
