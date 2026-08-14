import { apiClient } from '@/services/apiClient';
import type { ServiceCategory, ServiceCategoryInput } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchCategories(): Promise<ServiceCategory[]> {
  const { data } = await apiClient.get<ApiEnvelope<ServiceCategory[]>>('/categories');
  return data.data;
}

export async function createCategory(input: ServiceCategoryInput): Promise<ServiceCategory> {
  const { data } = await apiClient.post<ApiEnvelope<ServiceCategory>>('/categories', input);
  return data.data;
}

export async function updateCategory(
  id: number,
  input: ServiceCategoryInput,
): Promise<ServiceCategory> {
  const { data } = await apiClient.put<ApiEnvelope<ServiceCategory>>(`/categories/${id}`, input);
  return data.data;
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
