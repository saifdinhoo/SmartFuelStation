import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { AdminFuelInventoryItem, FuelType } from '@/features/fuel/types';
import { FUEL_TYPE_LABELS } from '@/features/fuel/types';
import { fuelFormSchema, type FuelFormValues } from './fuelFormSchema';

interface AdminFuelUpdateModalProps {
  open: boolean;
  onClose: () => void;
  fuelType: FuelType;
  /** The existing row for this fuel type, or null if never configured yet. */
  existing: AdminFuelInventoryItem | null;
  onSubmit: (values: FuelFormValues) => Promise<void>;
  isSaving: boolean;
}

export function AdminFuelUpdateModal({
  open,
  onClose,
  fuelType,
  existing,
  onSubmit,
  isSaving,
}: AdminFuelUpdateModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FuelFormValues>({ resolver: zodResolver(fuelFormSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      capacityLiters: existing?.capacityLiters ?? 0,
      currentLiters: existing?.currentLiters ?? 0,
      pricePerLiter: existing?.pricePerLiter ?? undefined,
    });
  }, [open, existing, reset]);

  async function submit(values: FuelFormValues) {
    await onSubmit(values);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${existing ? 'Update' : 'Set up'} ${FUEL_TYPE_LABELS[fuelType]}`}
    >
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Capacity (L)"
          type="number"
          step="0.01"
          min="0"
          error={errors.capacityLiters?.message}
          {...register('capacityLiters', { valueAsNumber: true })}
        />
        <Input
          label="Remaining (L)"
          type="number"
          step="0.01"
          min="0"
          error={errors.currentLiters?.message}
          {...register('currentLiters', { valueAsNumber: true })}
        />
        <Input
          label="Price per liter (optional)"
          type="number"
          step="0.01"
          min="0"
          error={errors.pricePerLiter?.message}
          {...register('pricePerLiter', {
            setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
          })}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
