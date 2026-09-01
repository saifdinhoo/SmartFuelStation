import { useState } from 'react';
import { Car, Pencil, Plus, Trash2 } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FUEL_TYPE_LABELS } from '@/features/fuel/types';
import { useMyVehicles } from './useMyVehicles';
import { useDeleteVehicle } from './useDeleteVehicle';
import { VehicleFormModal } from './VehicleFormModal';
import type { Vehicle } from './types';

export function MyVehiclesPage() {
  const { vehicles, isPending, isError, errorMessage, reload } = useMyVehicles();
  const { deleteVehicle, isPending: isDeleting } = useDeleteVehicle();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setFormOpen(true);
  }

  async function handleConfirmDelete() {
    if (pendingDeleteId === null) return;
    await deleteVehicle(pendingDeleteId);
    setPendingDeleteId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-2">My Vehicles</h1>
          <p className="text-body-sm text-muted-foreground">
            Vehicles you'd like on hand when booking a service.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add vehicle
        </Button>
      </div>

      {isError && (
        <ErrorState onRetry={reload} description={errorMessage ?? 'Could not load your vehicles.'} />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}

      {!isError && !isPending && vehicles.length === 0 && (
        <EmptyState
          icon={Car}
          title="No vehicles yet"
          description="Add a vehicle so it's on hand the next time you book a service."
        />
      )}

      {!isError && !isPending && vehicles.length > 0 && (
        <Reveal className="flex flex-col gap-3">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    {vehicle.fuelType && (
                      <Badge variant="secondary">{FUEL_TYPE_LABELS[vehicle.fuelType]}</Badge>
                    )}
                  </div>
                  <p className="text-body-sm text-muted-foreground">
                    {[vehicle.color, vehicle.plate].filter(Boolean).join(' · ') || 'No other details'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    className="h-9 w-9 shrink-0 p-0"
                    aria-label="Edit vehicle"
                    onClick={() => openEdit(vehicle)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9 w-9 shrink-0 p-0 text-destructive"
                    aria-label="Delete vehicle"
                    onClick={() => setPendingDeleteId(vehicle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </Reveal>
      )}

      <VehicleFormModal open={formOpen} onClose={() => setFormOpen(false)} existing={editing} />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Remove this vehicle?"
        description="This cannot be undone."
        confirmLabel="Remove vehicle"
        danger
        isLoading={isDeleting}
      />
    </div>
  );
}
