import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { useBookingPolicy, useUpdateBookingPolicy } from './useBookingPolicy';
import { bookingPolicyFormSchema, type BookingPolicyFormValues } from './bookingPolicyFormSchema';

// Real, enforced platform configuration — see bookingPolicy.service.js.
// These values are not merely displayed here: availability.service.js and
// booking.service.js reject a booking that violates them independently of
// this form.
export function BookingPolicyCard() {
  const { policy, isPending, isError, errorMessage } = useBookingPolicy();
  const { save, isSaving } = useUpdateBookingPolicy();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<BookingPolicyFormValues>({ resolver: zodResolver(bookingPolicyFormSchema) });

  useEffect(() => {
    if (!policy) return;
    reset({
      minAdvanceMinutes: policy.minAdvanceMinutes,
      maxAdvanceDays: policy.maxAdvanceDays,
      allowSameDayBooking: policy.allowSameDayBooking,
    });
  }, [policy, reset]);

  async function onSubmit(values: BookingPolicyFormValues) {
    const updated = await save(values);
    reset({
      minAdvanceMinutes: updated.minAdvanceMinutes,
      maxAdvanceDays: updated.maxAdvanceDays,
      allowSameDayBooking: updated.allowSameDayBooking,
    });
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 text-heading-3">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Booking window configuration
        </h2>
        <p className="text-caption">
          Applies platform-wide, to every provider — enforced on both the availability grid and
          booking creation, not just shown here.
        </p>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-40" />
          </div>
        )}

        {isError && <Alert variant="destructive" title="Could not load the booking policy">{errorMessage}</Alert>}

        {policy && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Input
              label="Minimum advance time (minutes)"
              type="number"
              min="0"
              max="10080"
              error={errors.minAdvanceMinutes?.message}
              {...register('minAdvanceMinutes', { valueAsNumber: true })}
            />
            <Input
              label="Maximum days in advance"
              type="number"
              min="1"
              max="365"
              error={errors.maxAdvanceDays?.message}
              {...register('maxAdvanceDays', { valueAsNumber: true })}
            />
            <Controller
              control={control}
              name="allowSameDayBooking"
              render={({ field }) => (
                <Switch label="Allow same-day booking" checked={field.value} onChange={field.onChange} />
              )}
            />
            <Button type="submit" isLoading={isSaving} disabled={!isDirty} className="self-start">
              Save booking policy
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
