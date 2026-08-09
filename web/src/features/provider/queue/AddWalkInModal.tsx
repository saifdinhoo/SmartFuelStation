import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { SERVICE_CATEGORIES } from '@/features/provider/services/types';
import { walkInSchema, type WalkInFormValues } from './walkInSchema';

const serviceOptions = SERVICE_CATEGORIES.map((category) => ({ value: category, label: category }));

interface AddWalkInModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: WalkInFormValues) => Promise<void>;
}

export function AddWalkInModal({ open, onClose, onSubmit }: AddWalkInModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WalkInFormValues>({
    resolver: zodResolver(walkInSchema),
    defaultValues: { customerName: '', service: SERVICE_CATEGORIES[0] },
  });

  async function submit(values: WalkInFormValues) {
    await onSubmit(values);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add walk-in customer">
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Customer name"
          error={errors.customerName?.message}
          {...register('customerName')}
        />
        <Select
          label="Service"
          options={serviceOptions}
          error={errors.service?.message}
          {...register('service')}
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
    </Modal>
  );
}
