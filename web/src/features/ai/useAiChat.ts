import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { sendAiChatMessage } from './aiApi';
import type { AiChatRequest, AiConversationMessage, AiLocale, AiMode, ChatMessage } from './types';

// Backend's own validateConversation() cap (backend/src/services/ai.service.js)
// — kept in sync manually since there's no shared package between web/backend.
const MAX_HISTORY_ENTRIES = 20;

function newMessageId() {
  return crypto.randomUUID();
}

// Conversation entries are plain {role, content} text. A follow-up question
// is folded into the assistant's own history content so Gemini still has it
// next turn even if the natural-language `reply` didn't restate it verbatim.
function toConversationEntry(message: ChatMessage): AiConversationMessage {
  const followUp = message.diagnosis?.followUpQuestion;
  return {
    role: message.role,
    content: followUp ? `${message.content}\n\n${followUp}` : message.content,
  };
}

interface UseAiChatOptions {
  locale: AiLocale;
  genericErrorMessage: string;
}

// Chat is an action, not a cacheable resource — conversation lives in plain
// component state for this session only (no query cache, no persistence),
// and each send is a one-off mutation.
export function useAiChat({ locale, genericErrorMessage }: UseAiChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<AiMode>('AUTO');

  const mutation = useMutation({
    mutationFn: (payload: AiChatRequest) => sendAiChatMessage(payload),
    onSuccess: (result) => {
      setMessages((current) => [
        ...current,
        {
          id: newMessageId(),
          role: 'assistant',
          content: result.reply,
          mode: result.mode,
          diagnosis: result.diagnosis,
          suggestedAction: result.suggestedAction,
          suggestedCategoryId: result.suggestedCategoryId,
        },
      ]);
    },
  });

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || mutation.isPending) return;

      // Snapshot of prior turns BEFORE this turn's user bubble is appended —
      // the current message is only ever sent once, as `message`, never
      // duplicated as the last conversation entry too.
      const conversation = messages.slice(-MAX_HISTORY_ENTRIES).map(toConversationEntry);

      setMessages((current) => [
        ...current,
        { id: newMessageId(), role: 'user', content: trimmed },
      ]);
      // No `role` field — the backend trusts only the authenticated JWT.
      mutation.mutate({ message: trimmed, mode, conversation, locale });
    },
    [messages, mode, locale, mutation],
  );

  const retry = useCallback(() => {
    if (mutation.variables) mutation.mutate(mutation.variables);
  }, [mutation]);

  const clear = useCallback(() => {
    setMessages([]);
    mutation.reset();
  }, [mutation]);

  return {
    messages,
    mode,
    setMode,
    sendMessage,
    isSending: mutation.isPending,
    isError: mutation.isError,
    errorMessage: mutation.isError ? getErrorMessage(mutation.error, genericErrorMessage) : null,
    canRetry: mutation.isError && mutation.variables !== undefined,
    retry,
    clear,
  };
}
