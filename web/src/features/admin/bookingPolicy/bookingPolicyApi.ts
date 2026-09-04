import { apiClient } from '@/services/apiClient';
import type { BookingPolicy, BookingPolicyInput } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchBookingPolicy(): Promise<BookingPolicy> {
  const { data } = await apiClient.get<ApiEnvelope<BookingPolicy>>('/admin/booking-policy');
  return data.data;
}

export async function updateBookingPolicy(input: BookingPolicyInput): Promise<BookingPolicy> {
  const { data } = await apiClient.patch<ApiEnvelope<BookingPolicy>>('/admin/booking-policy', input);
  return data.data;
}
