import { apiClient } from '@/services/apiClient';
import type { CreateComplaintInput, MyComplaint } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchMyComplaints(): Promise<MyComplaint[]> {
  const { data } = await apiClient.get<ApiEnvelope<MyComplaint[]>>('/complaints/me');
  return data.data;
}

export async function createComplaint(input: CreateComplaintInput): Promise<MyComplaint> {
  const { data } = await apiClient.post<ApiEnvelope<MyComplaint>>('/complaints', input);
  return data.data;
}
