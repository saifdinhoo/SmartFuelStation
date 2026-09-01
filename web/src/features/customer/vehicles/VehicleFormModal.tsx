import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { FUEL_TYPES, FUEL_TYPE_LABELS, type FuelType } from '@/features/fuel/types';
import { useCreateVehicle } from './useCreateVehicle';
import { useUpdateVehicle } from './useUpdateVehicle';
import type { Vehicle } from './types';

interface VehicleFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing an existing vehicle; absent when adding a new one. */
  existing?: Vehicle | null;
}

const CURRENT_YEAR = new Date().getFullYear();

function emptyForm() {
  return { make: '', model: '', year: String(CURRENT_YEAR), plate: '', color: '', fuelType: '' };
}

function formFrom(vehicle: Vehicle) {
  return {
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    plate: vehicle.plate ?? '',
    color: vehicle.color ?? '',
    fuelType: vehicle.fuelType ?? '',
  };
}

export function VehicleFormModal({ open, onClose, existing }: VehicleFormModalProps) {
  const { createVehicle, isPending: isCreating } = useCreateVehicle();
  const { updateVehicle, isPending: isUpdating } = useUpdateVehicle();
  const isPending = isCreating || isUpdating;

  const [form, setForm] = useState(existing ? formFrom(existing) : emptyForm());
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setForm(existing ? formFrom(existing) : emptyForm());
  }

  const year = Number(form.year);
  const isValid =
    form.make.trim().length > 0 &&
    form.model.trim().length > 0 &&
    Number.isInteger(year) &&
    year >= 1900 &&
    year <= CURRENT_YEAR + 1;

  async function submit() {
    if (!isValid) return;
    const values = {
      make: form.make.trim(),
      model: form.model.trim(),
      year,
      plate: form.plate.trim() || null,
      color: form.color.trim() || null,
      fuelType: (form.fuelType || null) as FuelType | null,
    };
    try {
      if (existing) {
        await updateVehicle({ id: existing.id, values });
      } else {
        await createVehicle(values);
      }
      onClose();
    } catch {
      // Already surfaced by the mutation hook's own toast.
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit vehicle' : 'Add a vehicle'}>
      <div className="flex flex-col gap-4">
        <Input
          label="Make"
          placeholder="Toyota"
          value={form.make}
          onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
          maxLength={50}
        />

        <Input
          label="Model"
          placeholder="Corolla"
          value={form.model}
          onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
          maxLength={50}
        />

        <Input
          label="Year"
          type="number"
          min={1900}
          max={CURRENT_YEAR + 1}
          value={form.year}
          onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
        />

        <Input
          label="Plate (optional)"
          placeholder="ABC 1234"
          value={form.plate}
          onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
          maxLength={20}
        />

        <Input
          label="Color (optional)"
          placeholder="Red"
          value={form.color}
          onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          maxLength={30}
        />

        <Select
          label="Fuel type (optional)"
          value={form.fuelType}
          onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}
          options={[
            { value: '', label: 'Not set' },
            ...FUEL_TYPES.map((type) => ({ value: type, label: FUEL_TYPE_LABELS[type] })),
          ]}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} isLoading={isPending} disabled={!isValid}>
            {existing ? 'Save changes' : 'Add vehicle'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
