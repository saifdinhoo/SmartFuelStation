import { apiClient } from '@/services/apiClient';
import type { Booking, BookingStatus, CreateBookingInput } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchBookings(): Promise<Booking[]> {
  const { data } = await apiClient.get<ApiEnvelope<Booking[]>>('/bookings');
  return data.data;
}

export async function fetchBookingById(id: number | string): Promise<Booking> {
  const { data } = await apiClient.get<ApiEnvelope<Booking>>(`/bookings/${id}`);
  return data.data;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { data } = await apiClient.post<ApiEnvelope<Booking>>('/bookings', input);
  return data.data;
}

export async function updateBookingStatus(
  id: number | string,
  status: BookingStatus,
): Promise<Booking> {
  const { data } = await apiClient.patch<ApiEnvelope<Booking>>(`/bookings/${id}`, { status });
  return data.data;
}
