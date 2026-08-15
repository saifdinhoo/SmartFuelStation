import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { serviceSchema, type ServiceFormValues } from './serviceSchema';
import type { Service, ServiceInput } from './types';

interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ServiceInput) => Promise<void>;
  service?: Service | null;
  categories: { id: number; name: string }[];
}

export function ServiceFormModal({
  open,
  onClose,
  onSubmit,
  service,
  categories,
}: ServiceFormModalProps) {
  const isEditing = Boolean(service);
  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
  });

  // Reset the form to match whichever service is being edited (or blank
  // for "add") whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    reset(
      service
        ? {
            name: service.name,
            categoryId: service.categoryId,
            price: service.price,
            durationMinutes: service.durationMinutes,
            available: service.available,
          }
        : {
            name: '',
            categoryId: categories[0]?.id ?? 0,
            price: 0,
            durationMinutes: 30,
            available: true,
          },
    );
  }, [open, service, categories, reset]);

  async function submit(values: ServiceFormValues) {
    await onSubmit(values);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit service' : 'Add service'}>
      {categories.length === 0 ? (
        <EmptyState
          title="No service categories yet"
          description="An administrator needs to create at least one service category before you can add a service."
        />
      ) : (
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
          <Input label="Service name" error={errors.name?.message} {...register('name')} />
          <Select
            label="Category"
            options={categoryOptions}
            error={errors.categoryId?.message}
            {...register('categoryId', { valueAsNumber: true })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price ($)"
              type="number"
              step="0.01"
              min="0"
              error={errors.price?.message}
              {...register('price', { valueAsNumber: true })}
            />
            <Input
              label="Duration (min)"
              type="number"
              min="1"
              error={errors.durationMinutes?.message}
              {...register('durationMinutes', { valueAsNumber: true })}
            />
          </div>
          <Controller
            control={control}
            name="available"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onChange={field.onChange}
                label="Available for booking"
              />
            )}
          />

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Save changes' : 'Add service'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
