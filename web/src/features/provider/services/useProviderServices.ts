import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchCategories } from '@/features/admin/categories/categoriesApi';
import {
  createOwnService,
  updateOwnService,
  deleteOwnService,
} from '@/features/provider/profile/providerProfileApi';
import {
  OWN_PROFILE_QUERY_KEY,
  useOwnProviderProfile,
} from '@/features/provider/profile/useOwnProviderProfile';
import type { Service, ServiceInput } from './types';

export type ServicesViewState = 'loading' | 'error' | 'ready';
export type AvailabilityFilter = 'all' | 'available' | 'unavailable';

const PAGE_SIZE = 5;

// The provider's services are part of GET /providers/me, so this reads the
// same cache entry as the rest of the provider screens instead of holding
// its own copy. Every mutation invalidates that one key and lets the server
// response define the new state.
export function useProviderServices() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { profile, isPending, isError, errorMessage, reload } = useOwnProviderProfile();

  // Real categories, for the form picker and the category filter.
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [page, setPage] = useState(1);

  const services: Service[] = useMemo(
    () =>
      (profile?.services ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        categoryId: s.categoryId,
        category: s.category.name,
        price: s.price,
        durationMinutes: s.durationMinutes,
        available: s.isAvailable,
      })),
    [profile],
  );

  const filteredServices = useMemo(
    () =>
      services.filter((service) => {
        const matchesSearch = service.name.toLowerCase().includes(search.trim().toLowerCase());
        const matchesCategory =
          categoryFilter === 'all' || String(service.categoryId) === categoryFilter;
        const matchesAvailability =
          availabilityFilter === 'all' ||
          (availabilityFilter === 'available' ? service.available : !service.available);
        return matchesSearch && matchesCategory && matchesAvailability;
      }),
    [services, search, categoryFilter, availabilityFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedServices = filteredServices.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 whenever a filter narrows the results — resetting
  // during render (React's documented pattern) rather than in an effect.
  const [lastFilterKey, setLastFilterKey] = useState('');
  const filterKey = `${search}|${categoryFilter}|${availabilityFilter}`;
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    if (page !== 1) setPage(1);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: OWN_PROFILE_QUERY_KEY });
    // What a provider offers changes what customers can discover and book.
    queryClient.invalidateQueries({ queryKey: ['providers'] });
  }

  function toWrite(input: ServiceInput) {
    return {
      name: input.name,
      price: input.price,
      durationMinutes: input.durationMinutes,
      categoryId: input.categoryId,
      isAvailable: input.available,
    };
  }

  const addMutation = useMutation({
    mutationFn: (input: ServiceInput) => createOwnService(toWrite(input)),
    onSuccess: () => {
      invalidate();
      showToast({ title: 'Service added', variant: 'success' });
    },
    onError: (err) =>
      showToast({ title: getErrorMessage(err, 'Could not add service'), variant: 'destructive' }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: ServiceInput }) =>
      updateOwnService(id, toWrite(input)),
    onSuccess: () => {
      invalidate();
      showToast({ title: 'Service updated', variant: 'success' });
    },
    onError: (err) =>
      showToast({
        title: getErrorMessage(err, 'Could not update service'),
        variant: 'destructive',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOwnService(id),
    onSuccess: () => {
      invalidate();
      showToast({ title: 'Service deleted', variant: 'success' });
    },
    onError: (err) =>
      // The backend refuses to delete a service with bookings or queue
      // history and explains why in the message — surface that verbatim
      // rather than a generic failure.
      showToast({
        title: getErrorMessage(err, 'Could not delete service'),
        variant: 'destructive',
      }),
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: number; isAvailable: boolean }) =>
      updateOwnService(id, { isAvailable }),
    onSuccess: () => invalidate(),
    onError: (err) =>
      showToast({
        title: getErrorMessage(err, 'Could not update availability'),
        variant: 'destructive',
      }),
  });

  const viewState: ServicesViewState = isPending ? 'loading' : isError ? 'error' : 'ready';

  return {
    viewState,
    errorMessage,
    services: paginatedServices,
    totalResultsCount: filteredServices.length,
    hasAnyServices: services.length > 0,
    categories: (categoriesQuery.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    page: safePage,
    totalPages,
    setPage,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    availabilityFilter,
    setAvailabilityFilter,
    reload,
    isMutating:
      addMutation.isPending ||
      editMutation.isPending ||
      deleteMutation.isPending ||
      availabilityMutation.isPending,
    addService: (input: ServiceInput) => addMutation.mutateAsync(input),
    editService: (id: number, input: ServiceInput) => editMutation.mutateAsync({ id, input }),
    removeService: (id: number) => deleteMutation.mutateAsync(id),
    toggleAvailability: (id: number) => {
      const target = services.find((s) => s.id === id);
      if (!target) return;
      availabilityMutation.mutate({ id, isAvailable: !target.available });
    },
  };
}
