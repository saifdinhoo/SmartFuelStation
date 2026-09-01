import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Fuel, Pencil } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchProviders } from '@/features/admin/providers/providersApi';
import { PROVIDERS_QUERY_KEY } from '@/features/admin/providers/useProviderApprovals';
import { FUEL_TYPES, FUEL_TYPE_LABELS, type FuelType } from '@/features/fuel/types';
import { FuelHistoryChart } from '@/features/fuel/FuelHistoryChart';
import { useAdminFuel, useAdminFuelHistory, useUpdateAdminFuel } from './useAdminFuel';
import { AdminFuelUpdateModal } from './AdminFuelUpdateModal';
import type { FuelFormValues } from './fuelFormSchema';

function formatLiters(value: number): string {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })} L`;
}

export function AdminFuelPage() {
  const providersQuery = useQuery({ queryKey: PROVIDERS_QUERY_KEY, queryFn: fetchProviders });
  const [providerId, setProviderId] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<FuelType | null>(null);

  const { fuel, isPending, isError, errorMessage, reload } = useAdminFuel(providerId ?? undefined);
  const { history } = useAdminFuelHistory(providerId ?? undefined, '30d');
  const { save, isSaving } = useUpdateAdminFuel(providerId ?? undefined);

  const providers = providersQuery.data ?? [];
  const selectedProvider = providers.find((p) => p.id === providerId) ?? null;
  const rowFor = (type: FuelType) => fuel?.find((f) => f.fuelType === type) ?? null;

  async function handleSubmit(values: FuelFormValues) {
    if (!editingType) return;
    await save(editingType, {
      capacityLiters: values.capacityLiters,
      currentLiters: values.currentLiters,
      pricePerLiter: values.pricePerLiter ?? null,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Fuel Management</h1>
        <p className="text-body-sm text-muted-foreground">
          Set and update real fuel inventory for stations that sell fuel.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select
            label="Provider"
            value={providerId ?? ''}
            onChange={(e) => setProviderId(e.target.value ? Number(e.target.value) : null)}
            options={[
              { value: '', label: 'Select a provider…' },
              ...providers.map((p) => ({ value: String(p.id), label: p.businessName })),
            ]}
          />
        </CardContent>
      </Card>

      {providerId !== null && selectedProvider && (
        <Reveal className="flex flex-col gap-4">
          <h2 className="text-heading-3">Provider: {selectedProvider.businessName}</h2>

          {isError && (
            <ErrorState
              title="Could not load fuel inventory"
              description={errorMessage ?? undefined}
              onRetry={reload}
            />
          )}

          {!isError && isPending && (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          )}

          {!isError && !isPending && (
            <div className="grid gap-4 sm:grid-cols-3">
              {FUEL_TYPES.map((type) => {
                const row = rowFor(type);
                return (
                  <Card key={type}>
                    <CardHeader className="flex flex-row items-center gap-2">
                      <Fuel className="h-4 w-4 text-primary" />
                      <h3 className="text-heading-3">{FUEL_TYPE_LABELS[type]}</h3>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      {row ? (
                        <>
                          <p className="text-body-sm">Capacity: {formatLiters(row.capacityLiters)}</p>
                          <p className="text-body-sm">Remaining: {formatLiters(row.currentLiters)}</p>
                          {row.pricePerLiter !== null && (
                            <p className="text-body-sm">Price/L: ${row.pricePerLiter}</p>
                          )}
                          <p className="text-body-sm font-medium text-foreground">
                            {row.percentageRemaining}%
                          </p>
                          <p className="text-caption">
                            Last updated {new Date(row.updatedAt).toLocaleString()}
                            {row.updatedByAdminName ? ` by ${row.updatedByAdminName}` : ''}
                          </p>
                        </>
                      ) : (
                        <p className="text-body-sm text-muted-foreground">Not configured yet.</p>
                      )}
                      <Button
                        variant="secondary"
                        className="mt-2 h-8 px-3 text-xs"
                        onClick={() => setEditingType(type)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {row ? 'Update' : 'Set up'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!isError && !isPending && fuel && fuel.length > 0 && (
            <>
              <FuelHistoryChart providerId={providerId} fuelTypes={fuel.map((f) => f.fuelType)} />

              <Card>
                <CardHeader>
                  <h2 className="text-heading-3">Recent changes</h2>
                </CardHeader>
                <CardContent>
                  {!history || history.length === 0 ? (
                    <p className="text-body-sm text-muted-foreground">No changes recorded yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {history.slice(0, 10).map((h) => (
                        <li
                          key={h.id}
                          className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
                        >
                          <span>
                            {FUEL_TYPE_LABELS[h.fuelType]}: {formatLiters(h.previousLiters)} →{' '}
                            {formatLiters(h.newLiters)}
                          </span>
                          <span className="text-caption">
                            {new Date(h.createdAt).toLocaleString()} · {h.changedByAdminName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </Reveal>
      )}

      {providerId === null && (
        <EmptyState
          icon={Fuel}
          title="Select a provider"
          description="Choose a provider above to view or set up its fuel inventory."
        />
      )}

      {editingType && (
        <AdminFuelUpdateModal
          open={editingType !== null}
          onClose={() => setEditingType(null)}
          fuelType={editingType}
          existing={rowFor(editingType)}
          onSubmit={handleSubmit}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
