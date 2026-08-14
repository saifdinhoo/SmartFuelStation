import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from './categoriesApi';
import type { ServiceCategory, ServiceCategoryInput } from './types';

export type CategoriesViewState = 'loading' | 'error' | 'ready';

export function useAdminCategories() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [viewState, setViewState] = useState<CategoriesViewState>('loading');
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setViewState('loading');
    try {
      const result = await fetchCategories();
      setCategories(result);
      setViewState('ready');
    } catch {
      setViewState('error');
    }
  }, []);

  useEffect(() => {
    // Real backend fetch on mount — the canonical effect use case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(term));
  }, [categories, search]);

  async function addCategory(input: ServiceCategoryInput) {
    try {
      const created = await createCategory(input);
      setCategories((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      showToast({ title: 'Category added', variant: 'success' });
    } catch (err) {
      showToast({ title: getErrorMessage(err, 'Could not add category'), variant: 'destructive' });
      throw err;
    }
  }

  async function editCategory(id: number, input: ServiceCategoryInput) {
    const previous = categories;
    setCategories((current) =>
      current.map((category) => (category.id === id ? { ...category, ...input } : category)),
    ); // optimistic
    try {
      const updated = await updateCategory(id, input);
      setCategories((current) =>
        current.map((category) => (category.id === id ? updated : category)),
      );
      showToast({ title: 'Category updated', variant: 'success' });
    } catch (err) {
      setCategories(previous); // rollback
      showToast({
        title: getErrorMessage(err, 'Could not update category'),
        variant: 'destructive',
      });
      throw err;
    }
  }

  async function removeCategory(id: number) {
    const previous = categories;
    setCategories((current) => current.filter((category) => category.id !== id)); // optimistic
    try {
      await deleteCategory(id);
      showToast({ title: 'Category deleted', variant: 'success' });
    } catch (err) {
      setCategories(previous); // rollback
      showToast({
        title: getErrorMessage(err, 'Could not delete category'),
        variant: 'destructive',
      });
    }
  }

  return {
    viewState,
    categories: filteredCategories,
    hasAnyCategories: categories.length > 0,
    search,
    setSearch,
    reload: load,
    addCategory,
    editCategory,
    removeCategory,
  };
}
