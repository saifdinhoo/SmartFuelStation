import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { commissionFormSchema, type CommissionFormValues } from './commissionFormSchema';

interface CommissionEditModalProps {
  open: boolean;
  onClose: () => void;
  providerName: string;
  currentRate: number | undefined;
  onSubmit: (values: CommissionFormValues) => Promise<void>;
  isSaving: boolean;
}

export function CommissionEditModal({
  open,
  onClose,
  providerName,
  currentRate,
  onSubmit,
  isSaving,
}: CommissionEditModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommissionFormValues>({ resolver: zodResolver(commissionFormSchema) });

  useEffect(() => {
    if (!open) return;
    reset({ commissionRate: currentRate ?? 10 });
  }, [open, currentRate, reset]);

  async function submit(values: CommissionFormValues) {
    await onSubmit(values);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Platform commission — ${providerName}`}>
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
        <Alert variant="info" title="Applies to future completions only">
          Changing this rate never rewrites the amounts on transactions that already exist —
          those keep the rate that was in effect when the booking completed.
        </Alert>
        <Input
          label="Commission (%)"
          type="number"
          step="0.01"
          min="0"
          max="100"
          error={errors.commissionRate?.message}
          {...register('commissionRate', { valueAsNumber: true })}
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
