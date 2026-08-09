import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useProviderServices } from './useProviderServices';
import { ServicesFilters } from './ServicesFilters';
import { ServicesTable } from './ServicesTable';
import { ServiceCardList } from './ServiceCardList';
import { ServiceFormModal } from './ServiceFormModal';
import type { Service, ServiceInput } from './types';

export function ServicesPage() {
  const {
    viewState,
    services,
    totalResultsCount,
    page,
    totalPages,
    setPage,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    availabilityFilter,
    setAvailabilityFilter,
    reload,
    simulateLoading,
    simulateEmpty,
    simulateError,
    addService,
    editService,
    removeService,
    toggleAvailability,
  } = useProviderServices();

  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function openAddForm() {
    setEditingService(null);
    setFormOpen(true);
  }

  function openEditForm(service: Service) {
    setEditingService(service);
    setFormOpen(true);
  }

  async function handleFormSubmit(input: ServiceInput) {
    if (editingService) {
      await editService(editingService.id, input);
    } else {
      await addService(input);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingService) return;
    setIsDeleting(true);
    try {
      await removeService(deletingService.id);
      setDeletingService(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-2">Services</h1>
          <p className="text-body-sm text-muted-foreground">
            Manage the services your business offers.
          </p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="h-4 w-4" />
          Add service
        </Button>
      </div>

      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-body-sm mb-3 text-muted-foreground">
          Demo controls — not part of the real page, just for showing each state.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={simulateLoading}>
            Reload (loading)
          </Button>
          <Button variant="ghost" onClick={simulateEmpty}>
            Simulate empty
          </Button>
          <Button variant="ghost" onClick={simulateError}>
            Simulate error
          </Button>
        </div>
      </div>

      {viewState === 'error' ? (
        <ErrorState onRetry={reload} />
      ) : (
        <Reveal className="flex flex-col gap-4">
          <ServicesFilters
            search={search}
            onSearchChange={setSearch}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            availabilityFilter={availabilityFilter}
            onAvailabilityChange={setAvailabilityFilter}
          />

          <ServicesTable
            services={services}
            isLoading={viewState === 'loading'}
            onToggleAvailability={toggleAvailability}
            onEdit={openEditForm}
            onDelete={setDeletingService}
          />
          <ServiceCardList
            services={services}
            isLoading={viewState === 'loading'}
            onToggleAvailability={toggleAvailability}
            onEdit={openEditForm}
            onDelete={setDeletingService}
          />

          {totalResultsCount > 0 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </Reveal>
      )}

      <ServiceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        service={editingService}
      />

      <ConfirmDialog
        open={Boolean(deletingService)}
        onClose={() => setDeletingService(null)}
        onConfirm={handleConfirmDelete}
        title="Delete service?"
        description={`This will remove "${deletingService?.name}" from your service list. This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        isLoading={isDeleting}
      />
    </div>
  );
}
