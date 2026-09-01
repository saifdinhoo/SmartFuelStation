import type { FuelType } from '@/features/fuel/types';

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  plate: string | null;
  color: string | null;
  fuelType: FuelType | null;
  createdAt: string;
  updatedAt: string;
}

// plate/color/fuelType are always present — as a value or explicit null,
// never omitted — so an update can distinguish "leave unchanged" (the
// backend's PATCH contract for an absent key) from "the customer cleared
// this field" (an explicit null).
export interface VehicleFormValues {
  make: string;
  model: string;
  year: number;
  plate: string | null;
  color: string | null;
  fuelType: FuelType | null;
}
