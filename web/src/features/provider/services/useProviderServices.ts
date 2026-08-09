import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/app/providers/ToastProvider';
import {
  fetchServices,
  createService,
  updateService,
  deleteService,
  setServiceAvailability,
} from './mockServicesApi';
import type { Service, ServiceInput } from './types';

export type ServicesViewState = 'loading' | 'error' | 'ready';
export type AvailabilityFilter = 'all' | 'available' | 'unavailable';

const PAGE_SIZE = 5;

export function useProviderServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [viewState, setViewState] = useState<ServicesViewState>('loading');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [page, setPage] = useState(1);
  const { showToast } = useToast();

  const load = useCallback(async (mode: 'ready' | 'empty' | 'error' = 'ready') => {
    setViewState('loading');
    try {
      const result = await fetchServices(mode);
      setServices(result);
      setViewState('ready');
    } catch {
      setViewState('error');
    }
  }, []);

  useEffect(() => {
    // Initial data fetch on mount — the canonical effect use case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch = service.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' ? service.available : !service.available);
      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [services, search, categoryFilter, availabilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedServices = filteredServices.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Reset to page 1 whenever a filter narrows the results — resetting
  // during render (React's documented pattern) rather than in an effect.
  const [lastFilterKey, setLastFilterKey] = useState('');
  const filterKey = `${search}|${categoryFilter}|${availabilityFilter}`;
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    if (page !== 1) setPage(1);
  }

  async function addService(input: ServiceInput) {
    const created = await createService(input);
    setServices((current) => [created, ...current]);
    showToast({ title: 'Service added', variant: 'success' });
  }

  async function editService(id: string, input: ServiceInput) {
    const updated = await updateService(id, input);
    setServices((current) => current.map((service) => (service.id === id ? updated : service)));
    showToast({ title: 'Service updated', variant: 'success' });
  }

  async function removeService(id: string) {
    await deleteService(id);
    setServices((current) => current.filter((service) => service.id !== id));
    showToast({ title: 'Service deleted', variant: 'success' });
  }

  async function toggleAvailability(id: string) {
    const target = services.find((service) => service.id === id);
    if (!target) return;
    const nextAvailable = !target.available;

    setServices((current) =>
      current.map((service) =>
        service.id === id ? { ...service, available: nextAvailable } : service,
      ),
    ); // optimistic

    try {
      await setServiceAvailability(id, nextAvailable);
    } catch {
      setServices((current) =>
        current.map((service) =>
          service.id === id ? { ...service, available: !nextAvailable } : service,
        ),
      ); // rollback
      showToast({ title: 'Could not update availability', variant: 'destructive' });
    }
  }

  return {
    viewState,
    services: paginatedServices,
    totalResultsCount: filteredServices.length,
    hasAnyServices: services.length > 0,
    page: safePage,
    totalPages,
    setPage,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    availabilityFilter,
    setAvailabilityFilter,
    reload: () => load('ready'),
    simulateLoading: () => load('ready'),
    simulateEmpty: () => load('empty'),
    simulateError: () => load('error'),
    addService,
    editService,
    removeService,
    toggleAvailability,
  };
}
