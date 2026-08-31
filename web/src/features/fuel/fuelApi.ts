import { apiClient } from '@/services/apiClient';
import type {
  AdminFuelHistoryEntry,
  AdminFuelInventoryItem,
  FuelHistoryPoint,
  FuelHistoryRange,
  FuelInventoryItem,
  FuelType,
} from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// --- public / provider-own reads --------------------------------------------

export async function fetchOwnFuel(): Promise<FuelInventoryItem[]> {
  const { data } = await apiClient.get<ApiEnvelope<FuelInventoryItem[]>>('/providers/me/fuel');
  return data.data;
}

export async function fetchProviderFuel(
  providerId: number | string,
): Promise<FuelInventoryItem[]> {
  const { data } = await apiClient.get<ApiEnvelope<FuelInventoryItem[]>>(
    `/providers/${providerId}/fuel`,
  );
  return data.data;
}

export async function fetchProviderFuelHistory(
  providerId: number | string,
  params: { fuelType?: FuelType; range?: FuelHistoryRange } = {},
): Promise<FuelHistoryPoint[]> {
  const { data } = await apiClient.get<ApiEnvelope<FuelHistoryPoint[]>>(
    `/providers/${providerId}/fuel/history`,
    { params },
  );
  return data.data;
}

// --- admin CRUD --------------------------------------------------------------

export async function fetchAdminFuel(
  providerId: number | string,
): Promise<AdminFuelInventoryItem[]> {
  const { data } = await apiClient.get<ApiEnvelope<AdminFuelInventoryItem[]>>(
    `/admin/providers/${providerId}/fuel`,
  );
  return data.data;
}

export interface FuelWriteInput {
  capacityLiters: number;
  currentLiters: number;
  pricePerLiter?: number | null;
}

export async function updateAdminFuel(
  providerId: number | string,
  fuelType: FuelType,
  input: FuelWriteInput,
): Promise<FuelInventoryItem> {
  const { data } = await apiClient.put<ApiEnvelope<FuelInventoryItem>>(
    `/admin/providers/${providerId}/fuel/${fuelType}`,
    input,
  );
  return data.data;
}

export async function fetchAdminFuelHistory(
  providerId: number | string,
  params: { fuelType?: FuelType; range?: FuelHistoryRange } = {},
): Promise<AdminFuelHistoryEntry[]> {
  const { data } = await apiClient.get<ApiEnvelope<AdminFuelHistoryEntry[]>>(
    `/admin/providers/${providerId}/fuel/history`,
    { params },
  );
  return data.data;
}
