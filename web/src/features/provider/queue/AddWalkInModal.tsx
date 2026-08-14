import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useOwnProviderServices } from './useOwnProviderServices';
import { walkInSchema, type WalkInFormValues } from './walkInSchema';

const emptyValues: WalkInFormValues = { customerName: '', providerServiceId: '' };

interface AddWalkInModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { customerName: string; providerServiceId: number }) => Promise<unknown>;
}

export function AddWalkInModal({ open, onClose, onSubmit }: AddWalkInModalProps) {
  const { services } = useOwnProviderServices();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WalkInFormValues>({
    resolver: zodResolver(walkInSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) reset(emptyValues);
  }, [open, reset]);

  async function submit(values: WalkInFormValues) {
    await onSubmit({
      customerName: values.customerName,
      providerServiceId: Number(values.providerServiceId),
    });
    reset(emptyValues);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add walk-in customer">
      {services.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          You have no available services to add a walk-in for yet.
        </p>
      ) : (
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Customer name"
            error={errors.customerName?.message}
            {...register('customerName')}
          />
          <Select
            label="Service"
            error={errors.providerServiceId?.message}
            {...register('providerServiceId')}
            options={[
              { value: '', label: 'Select a service…' },
              ...services.map((s) => ({ value: String(s.id), label: s.name })),
            ]}
          />
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add to queue
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
