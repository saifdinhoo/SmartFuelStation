import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useAiChat } from './useAiChat';
import { apiClient } from '@/services/apiClient';
import type { AiChatResponse } from './types';

vi.mock('@/services/apiClient', () => ({
  apiClient: { post: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function supportResponse(overrides: Partial<AiChatResponse> = {}): AiChatResponse {
  return {
    reply: 'Sure, here is how it works.',
    mode: 'SUPPORT',
    suggestedAction: null,
    suggestedCategoryId: null,
    diagnosis: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAiChat', () => {
  it('defaults to AUTO mode', () => {
    const { result } = renderHook(() => useAiChat({ locale: 'en', genericErrorMessage: 'err' }), {
      wrapper,
    });
    expect(result.current.mode).toBe('AUTO');
  });

  it('sends message/mode/conversation/locale — and never a role field', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: supportResponse() } });
    const { result } = renderHook(() => useAiChat({ locale: 'en', genericErrorMessage: 'err' }), {
      wrapper,
    });

    act(() => result.current.sendMessage('How do I cancel a booking?'));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(body).toEqual({
      message: 'How do I cancel a booking?',
      mode: 'AUTO',
      conversation: [],
      locale: 'en',
    });
    expect(Object.keys(body as object)).not.toContain('role');
  });

  it('appends the user bubble immediately and the assistant reply once it resolves', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: supportResponse({ reply: 'Here you go.' }) },
    });
    const { result } = renderHook(() => useAiChat({ locale: 'en', genericErrorMessage: 'err' }), {
      wrapper,
    });

    act(() => result.current.sendMessage('hi'));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'hi' });
    expect(result.current.isSending).toBe(true);

    await waitFor(() => expect(result.current.isSending).toBe(false));
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({ role: 'assistant', content: 'Here you go.' });
  });

  it('sends prior turns as conversation, without duplicating the current message as the last entry', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: supportResponse() } });
    const { result } = renderHook(() => useAiChat({ locale: 'en', genericErrorMessage: 'err' }), {
      wrapper,
    });

    act(() => result.current.sendMessage('first message'));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    act(() => result.current.sendMessage('second message'));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    const [, secondBody] = vi.mocked(apiClient.post).mock.calls[1];
    expect(secondBody).toMatchObject({
      message: 'second message',
      conversation: [
        { role: 'user', content: 'first message' },
        { role: 'assistant', content: 'Sure, here is how it works.' },
      ],
    });
    // The just-sent message never appears a second time inside `conversation`.
    const conversation = (secondBody as { conversation: Array<{ content: string }> }).conversation;
    expect(conversation.some((entry) => entry.content === 'second message')).toBe(false);
  });

  it('folds a diagnosis follow-up question into assistant history content', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: supportResponse({
          mode: 'DIAGNOSIS',
          reply: 'Could be a few things.',
          diagnosis: {
            urgency: 'LOW',
            possibleCauses: [],
            recommendedServiceCategory: null,
            safetyAdvice: null,
            followUpQuestion: 'Does it happen while braking or accelerating?',
          },
        }),
      },
    });
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, data: supportResponse() },
    });

    const { result } = renderHook(() => useAiChat({ locale: 'en', genericErrorMessage: 'err' }), {
      wrapper,
    });

    act(() => result.current.sendMessage('My car makes a noise.'));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    act(() => result.current.sendMessage('It happens while braking.'));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    const [, secondBody] = vi.mocked(apiClient.post).mock.calls[1];
    const conversation = (secondBody as { conversation: Array<{ role: string; content: string }> })
      .conversation;
    expect(conversation[1].content).toContain('Does it happen while braking or accelerating?');
  });

  it('respects the mode selector for the request payload', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: supportResponse() } });
    const { result } = renderHook(() => useAiChat({ locale: 'en', genericErrorMessage: 'err' }), {
      wrapper,
    });

    act(() => result.current.setMode('DIAGNOSIS'));
    act(() => result.current.sendMessage('My brakes are grinding.'));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(body).toMatchObject({ mode: 'DIAGNOSIS' });
  });

  it('sends the given locale', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, data: supportResponse() } });
    const { result } = renderHook(() => useAiChat({ locale: 'ar', genericErrorMessage: 'err' }), {
      wrapper,
    });

    act(() => result.current.sendMessage('مرحبا'));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(body).toMatchObject({ locale: 'ar' });
  });

  it('ignores an empty/whitespace-only message', () => {
    const { result } = renderHook(() => useAiChat({ locale: 'en', genericErrorMessage: 'err' }), {
      wrapper,
    });
    act(() => result.current.sendMessage('   '));
    expect(result.current.messages).toHaveLength(0);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('exposes a friendly error and allows retry with the exact same request', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('network down'));
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, data: supportResponse() },
    });

    const { result } = renderHook(() => useAiChat({ locale: 'en', genericErrorMessage: 'fallback' }), {
      wrapper,
    });

    act(() => result.current.sendMessage('hi'));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorMessage).toBeTruthy();
    expect(result.current.canRetry).toBe(true);
    // Still just the one user bubble — a failure doesn't fabricate a reply.
    expect(result.current.messages).toHaveLength(1);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.messages).toHaveLength(2);
    expect(apiClient.post).toHaveBeenCalledTimes(2);
    // Retry replays the exact same variables — not a fresh message bubble.
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toEqual(
      vi.mocked(apiClient.post).mock.calls[1][1],
    );
  });

  it('clear resets messages and any error state', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useAiChat({ locale: 'en', genericErrorMessage: 'err' }), {
      wrapper,
    });

    act(() => result.current.sendMessage('hi'));
    await waitFor(() => expect(result.current.isError).toBe(true));

    act(() => result.current.clear());
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isError).toBe(false);
    expect(result.current.canRetry).toBe(false);
  });
});
