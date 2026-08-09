import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { useAdminCategories } from './useAdminCategories';
import { CategoryFormModal } from './CategoryFormModal';
import type { ServiceCategory, ServiceCategoryInput } from './types';

export function CategoriesPage() {
  const {
    viewState,
    categories,
    search,
    setSearch,
    reload,
    addCategory,
    editCategory,
    removeCategory,
  } = useAdminCategories();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ServiceCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function openAddForm() {
    setEditingCategory(null);
    setFormOpen(true);
  }

  function openEditForm(category: ServiceCategory) {
    setEditingCategory(category);
    setFormOpen(true);
  }

  async function handleFormSubmit(input: ServiceCategoryInput) {
    if (editingCategory) {
      await editCategory(editingCategory.id, input);
    } else {
      await addCategory(input);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      await removeCategory(deletingCategory.id);
      setDeletingCategory(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<ServiceCategory>[] = [
    { key: 'name', header: 'Name', render: (c) => <span className="font-medium">{c.name}</span> },
    {
      key: 'description',
      header: 'Description',
      render: (c) => <span className="text-muted-foreground">{c.description || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <Badge variant={c.isActive ? 'success' : 'secondary'}>
          {c.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => openEditForm(c)}
            aria-label={`Edit ${c.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setDeletingCategory(c)}
            aria-label={`Delete ${c.name}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-2">Categories</h1>
          <p className="text-body-sm text-muted-foreground">
            Manage the service categories providers can offer.
          </p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="h-4 w-4" />
          Add category
        </Button>
      </div>

      {viewState === 'error' ? (
        <ErrorState onRetry={reload} description="Could not load categories." />
      ) : (
        <Reveal className="flex flex-col gap-4">
          <div className="max-w-sm">
            <SearchInput
              label="Search categories"
              hideLabel
              placeholder="Search categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <DataTable
            columns={columns}
            rows={categories}
            getRowKey={(c) => String(c.id)}
            isLoading={viewState === 'loading'}
            emptyMessage="No service categories yet. Add the first one to get started."
          />
        </Reveal>
      )}

      <CategoryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        category={editingCategory}
      />

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleConfirmDelete}
        title="Delete category?"
        description={`This will remove "${deletingCategory?.name}" from the category list. This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        isLoading={isDeleting}
      />
    </div>
  );
}
