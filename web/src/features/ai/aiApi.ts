import { apiClient } from '@/services/apiClient';
import type { AiChatRequest, AiChatResponse } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// The ONLY place this feature talks to the network — always our own
// backend, never Gemini. `role` is never part of AiChatRequest: the backend
// derives it from the verified JWT, so there is nothing for this client to
// send or spoof.
export async function sendAiChatMessage(payload: AiChatRequest): Promise<AiChatResponse> {
  const { data } = await apiClient.post<ApiEnvelope<AiChatResponse>>('/ai/chat', payload);
  return data.data;
}
