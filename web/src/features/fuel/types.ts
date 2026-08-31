// Shared between the admin fuel-management UI and the customer/provider
// read-only fuel displays — all three talk to the same backend shapes (see
// backend/src/services/fuelInventory.service.js).

export type FuelType = 'GASOLINE_95' | 'GASOLINE_98' | 'DIESEL';

export const FUEL_TYPES: FuelType[] = ['GASOLINE_95', 'GASOLINE_98', 'DIESEL'];

// Mirrors backend/src/services/shared/fuelTypes.js — kept as a fallback
// only; every real row already carries its own server-computed
// `displayName`, so this is never the source of truth.
export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  GASOLINE_95: 'Gasoline 95',
  GASOLINE_98: 'Gasoline 98',
  DIESEL: 'Diesel / Solar',
};

// GET /providers/:id/fuel and /providers/me/fuel — the public-safe shape.
// Never carries updatedByAdminId or any other audit field.
export interface FuelInventoryItem {
  fuelType: FuelType;
  displayName: string;
  capacityLiters: number;
  currentLiters: number;
  percentageRemaining: number;
  pricePerLiter: number | null;
  updatedAt: string;
}

// GET /admin/providers/:id/fuel — the audit-rich admin shape.
export interface AdminFuelInventoryItem extends FuelInventoryItem {
  id: number;
  providerId: number;
  updatedByAdminId: number | null;
  updatedByAdminName: string | null;
  createdAt: string;
}

export type FuelHistoryRange = '7d' | '30d' | '90d';

// GET /providers/:id/fuel/history — chart points only.
export interface FuelHistoryPoint {
  fuelType: FuelType;
  liters: number;
  timestamp: string;
}

// GET /admin/providers/:id/fuel/history — full audit trail.
export interface AdminFuelHistoryEntry {
  id: number;
  fuelType: FuelType;
  previousLiters: number;
  newLiters: number;
  previousCapacityLiters: number | null;
  newCapacityLiters: number | null;
  previousPricePerLiter: number | null;
  newPricePerLiter: number | null;
  changedByAdminId: number;
  changedByAdminName: string;
  createdAt: string;
}
