import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheck } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { OperatingHoursEditor } from '@/features/provider/hours/OperatingHoursEditor';
import { useOwnFuel } from '@/features/fuel/useFuel';
import { FuelStatusList } from '@/features/fuel/FuelStatusList';
import { useOwnProviderProfile, useUpdateOwnProfile } from './useOwnProviderProfile';
import { businessProfileSchema, type BusinessProfileFormValues } from './businessProfileSchema';

function toFormValue(value: number | null): string {
  return value === null ? '' : String(value);
}

export function BusinessProfilePage() {
  const { profile, isPending, isError, errorMessage, reload } = useOwnProviderProfile();
  const { save, isSaving } = useUpdateOwnProfile();
  const fuel = useOwnFuel();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
  });

  // Seed the form once the real profile arrives, and re-seed after a save
  // so `isDirty` resets against the newly-persisted values.
  useEffect(() => {
    if (!profile) return;
    reset({
      businessName: profile.businessName,
      description: profile.description ?? '',
      address: profile.address,
      name: profile.user.name,
      phone: profile.user.phone ?? '',
      latitude: toFormValue(profile.latitude),
      longitude: toFormValue(profile.longitude),
    });
  }, [profile, reset]);

  async function onSubmit(values: BusinessProfileFormValues) {
    await save({
      businessName: values.businessName,
      description: values.description?.trim() ? values.description : null,
      address: values.address,
      name: values.name,
      phone: values.phone?.trim() ? values.phone : null,
      latitude: values.latitude?.trim() ? Number(values.latitude) : null,
      longitude: values.longitude?.trim() ? Number(values.longitude) : null,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Business Profile</h1>
        <p className="text-body-sm text-muted-foreground">
          The details customers see when they find your business.
        </p>
      </div>

      {isError && (
        <ErrorState
          title="Could not load your business profile"
          description={errorMessage ?? undefined}
          onRetry={reload}
        />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      )}

      {!isError && !isPending && profile && (
        <Reveal className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={profile.isApproved ? 'success' : 'warning'}>
              <BadgeCheck className="mr-1 inline h-3.5 w-3.5" />
              {profile.isApproved ? 'Approved' : 'Pending approval'}
            </Badge>
            <Badge variant={profile.isOpen ? 'success' : 'secondary'}>
              {profile.isOpen ? 'Open now' : 'Closed'}
            </Badge>
            {profile.rating.averageRating !== null && (
              <Badge variant="default">
                {profile.rating.averageRating.toFixed(1)} ★ ({profile.rating.reviewCount})
              </Badge>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Card>
              <CardHeader>
                <h2 className="text-heading-3">Business details</h2>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input
                  label="Business name"
                  error={errors.businessName?.message}
                  {...register('businessName')}
                />
                <Textarea
                  label="Description"
                  rows={4}
                  placeholder="Tell customers what your business does…"
                  error={errors.description?.message}
                  {...register('description')}
                />
                <Input label="Address" error={errors.address?.message} {...register('address')} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-heading-3">Contact</h2>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input label="Contact name" error={errors.name?.message} {...register('name')} />
                <Input
                  label="Phone"
                  type="tel"
                  placeholder="+961 …"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                <Input label="Email" value={profile.user.email} readOnly disabled />
                <p className="text-caption">
                  Email is your sign-in identity and can&apos;t be changed here.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-heading-3">Location</h2>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Latitude"
                    type="number"
                    step="0.000001"
                    placeholder="33.888630"
                    error={errors.latitude?.message}
                    {...register('latitude')}
                  />
                  <Input
                    label="Longitude"
                    type="number"
                    step="0.000001"
                    placeholder="35.495480"
                    error={errors.longitude?.message}
                    {...register('longitude')}
                  />
                </div>
                <p className="text-caption">
                  Used to rank your business by distance in customer search.
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={!isDirty || isSaving}
                onClick={() => reload()}
              >
                Discard changes
              </Button>
              <Button type="submit" isLoading={isSaving} disabled={!isDirty}>
                Save changes
              </Button>
            </div>
          </form>

          <OperatingHoursEditor />

          {!fuel.isPending && !fuel.isError && fuel.fuel && fuel.fuel.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-heading-3">My Fuel Inventory</h2>
                <p className="text-body-sm text-muted-foreground">
                  Fuel inventory is managed by the platform administrator.
                </p>
              </CardHeader>
              <CardContent>
                <FuelStatusList items={fuel.fuel} />
              </CardContent>
            </Card>
          )}
        </Reveal>
      )}
    </div>
  );
}
