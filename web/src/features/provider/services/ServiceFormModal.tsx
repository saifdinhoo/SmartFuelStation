import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { serviceSchema, type ServiceFormValues } from './serviceSchema';
import { SERVICE_CATEGORIES, type Service, type ServiceInput } from './types';

const categoryOptions = SERVICE_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

const emptyValues: ServiceFormValues = {
  name: '',
  category: SERVICE_CATEGORIES[0],
  price: 0,
  durationMinutes: 0,
  available: true,
};

interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ServiceInput) => Promise<void>;
  service?: Service | null;
}

export function ServiceFormModal({ open, onClose, onSubmit, service }: ServiceFormModalProps) {
  const isEditing = Boolean(service);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: emptyValues,
  });

  // Reset the form to match whichever service is being edited (or blank
  // for "add") whenever the modal opens.
  useEffect(() => {
    if (open) {
      reset(service ? { ...service } : emptyValues);
    }
  }, [open, service, reset]);

  async function submit(values: ServiceFormValues) {
    await onSubmit(values);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit service' : 'Add service'}>
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
        <Input label="Service name" error={errors.name?.message} {...register('name')} />
        <Select
          label="Category"
          options={categoryOptions}
          error={errors.category?.message}
          {...register('category')}
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
            min="0"
            error={errors.durationMinutes?.message}
            {...register('durationMinutes', { valueAsNumber: true })}
          />
        </div>
        <Controller
          control={control}
          name="available"
          render={({ field }) => (
            <Switch checked={field.value} onChange={field.onChange} label="Available for booking" />
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
    </Modal>
  );
}
