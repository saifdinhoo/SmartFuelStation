import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { categorySchema, type CategoryFormValues } from './categorySchema';
import type { ServiceCategory, ServiceCategoryInput } from './types';

const emptyValues: CategoryFormValues = { name: '', description: '' };

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ServiceCategoryInput) => Promise<void>;
  category?: ServiceCategory | null;
}

export function CategoryFormModal({ open, onClose, onSubmit, category }: CategoryFormModalProps) {
  const isEditing = Boolean(category);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      reset(
        category ? { name: category.name, description: category.description ?? '' } : emptyValues,
      );
    }
  }, [open, category, reset]);

  async function submit(values: CategoryFormValues) {
    await onSubmit(values);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit category' : 'Add category'}>
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
        <Input label="Category name" error={errors.name?.message} {...register('name')} />
        <Textarea
          label="Description"
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Save changes' : 'Add category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
