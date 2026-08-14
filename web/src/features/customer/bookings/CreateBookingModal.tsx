import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { ProviderServiceItem } from '@/features/customer/discovery/types';
import { createBookingSchema, type CreateBookingFormValues } from './createBookingSchema';
import { useCreateBooking } from './useCreateBooking';

interface CreateBookingModalProps {
  open: boolean;
  onClose: () => void;
  services: ProviderServiceItem[];
}

const emptyValues: CreateBookingFormValues = { providerServiceId: '', scheduledAt: '', notes: '' };

// Earliest selectable moment — a few minutes from now, matching the
// backend's "scheduledAt must be in the future" rule with a little slack
// for the time it takes to fill out the form.
function minDateTimeLocal() {
  const d = new Date(Date.now() + 5 * 60_000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export function CreateBookingModal({ open, onClose, services }: CreateBookingModalProps) {
  const navigate = useNavigate();
  const { createBooking, isPending } = useCreateBooking();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBookingFormValues>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  const availableServices = services.filter((s) => s.isAvailable);

  async function submit(values: CreateBookingFormValues) {
    const booking = await createBooking({
      providerServiceId: Number(values.providerServiceId),
      scheduledAt: new Date(values.scheduledAt).toISOString(),
      notes: values.notes,
    });
    onClose();
    navigate(`/customer/bookings/${booking.id}`);
  }

  return (
    <Modal open={open} onClose={onClose} title="Book a service">
      {availableServices.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          This provider has no bookable services right now.
        </p>
      ) : (
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
          <Select
            label="Service"
            error={errors.providerServiceId?.message}
            {...register('providerServiceId')}
            options={[
              { value: '', label: 'Select a service…' },
              ...availableServices.map((s) => ({
                value: String(s.id),
                label: `${s.name} — $${s.price} (${s.durationMinutes} min)`,
              })),
            ]}
          />
          <Input
            type="datetime-local"
            label="Date & time"
            min={minDateTimeLocal()}
            error={errors.scheduledAt?.message}
            {...register('scheduledAt')}
          />
          <Textarea
            label="Notes (optional)"
            placeholder="Anything the provider should know…"
            error={errors.notes?.message}
            {...register('notes')}
          />

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Request booking
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
