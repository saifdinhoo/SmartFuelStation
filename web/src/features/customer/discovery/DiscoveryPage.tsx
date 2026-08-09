import { MapPin } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useProviderDiscovery } from './useProviderDiscovery';
import { DiscoveryFilters } from './DiscoveryFilters';
import { ProviderCard } from './ProviderCard';

export function DiscoveryPage() {
  const {
    providers,
    viewState,
    locationStatus,
    retryLocation,
    search,
    setSearch,
    category,
    setCategory,
    sort,
    setSort,
    openNowOnly,
    setOpenNowOnly,
    reload,
    simulateEmpty,
  } = useProviderDiscovery();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Find Services</h1>
        <p className="text-body-sm text-muted-foreground">
          Automotive shops near you, sorted by distance, rating, or price.
        </p>
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

      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-body-sm mb-3 text-muted-foreground">
          Demo controls — not part of the real page, just for showing each state.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={reload}>
            Reload (loading)
          </Button>
          <Button variant="ghost" onClick={simulateEmpty}>
            Simulate empty
          </Button>
        </div>
      </div>

      <DiscoveryFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        sort={sort}
        onSortChange={setSort}
        openNowOnly={openNowOnly}
        onOpenNowOnlyChange={setOpenNowOnly}
      />

      {viewState === 'error' && (
        <ErrorState onRetry={reload} description="Could not load nearby providers." />
      )}

      {viewState === 'loading' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      )}

      {viewState === 'ready' && providers.length === 0 && (
        <EmptyState
          title="No providers match your filters"
          description='Try a different search term, category, or turn off "Open now".'
        />
      )}

      {viewState === 'ready' && providers.length > 0 && (
        <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </Reveal>
      )}
    </div>
  );
}
