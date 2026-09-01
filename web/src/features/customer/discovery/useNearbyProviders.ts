import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchProviders, fetchCategories, fetchRatingSummary } from './discoveryApi';
import { mapProvider } from './providerHelpers';
import { useGeolocation } from './useGeolocation';
import type { SortOption } from './types';

// Lets a caller deep-link into this page with a category pre-selected (e.g.
// "?categoryId=5" from the AI assistant's FIND_PROVIDER suggestion) without
// adding a full URL-synced filter state — read once on mount, same as any
// other initial value.
function readInitialCategoryId(searchParams: URLSearchParams): number | 'all' {
  const raw = searchParams.get('categoryId');
  const parsed = raw ? Number(raw) : NaN;
  return Number.isInteger(parsed) ? parsed : 'all';
}

export function useNearbyProviders() {
  const [searchParams] = useSearchParams();
  const { status: locationStatus, coordinates, retry: retryLocation } = useGeolocation();

  const providersQuery = useQuery({
    queryKey: ['providers'],
    queryFn: fetchProviders,
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  // One small query per provider for its rating summary. Same query key
  // shape as useProviderRating, so navigating into a provider's details
  // page reuses whatever's already cached here instead of refetching.
  const ratingQueries = useQueries({
    queries: (providersQuery.data ?? []).map((provider) => ({
      queryKey: ['rating-summary', provider.id],
      queryFn: () => fetchRatingSummary(provider.id),
      staleTime: 60_000,
    })),
  });

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | 'all'>(() =>
    readInitialCategoryId(searchParams),
  );
  const [sort, setSort] = useState<SortOption>('distance');
  const [openNowOnly, setOpenNowOnly] = useState(false);

  const providers = useMemo(() => {
    if (!providersQuery.data) return [];
    let list = providersQuery.data.map((raw, index) =>
      mapProvider(raw, coordinates, ratingQueries[index]?.data?.averageRating),
    );

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.businessName.toLowerCase().includes(term) ||
          p.services.some(
            (s) =>
              s.name.toLowerCase().includes(term) || s.category.name.toLowerCase().includes(term),
          ),
      );
    }

    if (categoryId !== 'all') {
      list = list.filter((p) => p.services.some((s) => s.category.id === categoryId));
    }

    if (openNowOnly) {
      list = list.filter((p) => p.isOpen);
    }

    list = [...list].sort((a, b) => {
      if (sort === 'distance') {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (sort === 'rating') {
        const aRating = a.averageRating ?? -1;
        const bRating = b.averageRating ?? -1;
        return bRating - aRating;
      }
      // sort === 'price'
      const aMin = a.services.length ? Math.min(...a.services.map((s) => s.price)) : Infinity;
      const bMin = b.services.length ? Math.min(...b.services.map((s) => s.price)) : Infinity;
      return aMin - bMin;
    });

    return list;
  }, [providersQuery.data, coordinates, search, categoryId, openNowOnly, sort, ratingQueries]);

  const categories = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.isActive),
    [categoriesQuery.data],
  );

  const isPending = providersQuery.isPending || categoriesQuery.isPending;
  const isError = providersQuery.isError || categoriesQuery.isError;
  const errorMessage = isError
    ? getErrorMessage(providersQuery.error ?? categoriesQuery.error, 'Could not load providers')
    : null;

  function reload() {
    providersQuery.refetch();
    categoriesQuery.refetch();
  }

  return {
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
  };
}
