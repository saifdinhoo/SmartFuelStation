import { apiClient } from '@/services/apiClient';
import type { Vehicle, VehicleFormValues } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchMyVehicles(): Promise<Vehicle[]> {
  const { data } = await apiClient.get<ApiEnvelope<Vehicle[]>>('/vehicles');
  return data.data;
}

export async function createVehicle(input: VehicleFormValues): Promise<Vehicle> {
  const { data } = await apiClient.post<ApiEnvelope<Vehicle>>('/vehicles', input);
  return data.data;
}

export async function updateVehicle(
  id: number,
  input: VehicleFormValues,
): Promise<Vehicle> {
  const { data } = await apiClient.patch<ApiEnvelope<Vehicle>>(`/vehicles/${id}`, input);
  return data.data;
}

export async function deleteVehicle(id: number): Promise<void> {
  await apiClient.delete(`/vehicles/${id}`);
}
