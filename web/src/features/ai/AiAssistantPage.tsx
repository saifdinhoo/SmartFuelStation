import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/app/providers/AuthProvider';
import { useDirection } from '@/app/providers/DirectionProvider';
import { useAiChat } from './useAiChat';
import { AI_LABELS } from './labels';
import { ModeSelector } from './components/ModeSelector';
import { ChatBubble } from './components/ChatBubble';
import { TypingIndicator } from './components/TypingIndicator';

export function AiAssistantPage() {
  const { user } = useAuth();
  const { language } = useDirection();
  const navigate = useNavigate();
  const labels = AI_LABELS[language];

  const {
    messages,
    mode,
    setMode,
    sendMessage,
    isSending,
    isError,
    errorMessage,
    canRetry,
    retry,
    clear,
  } = useAiChat({ locale: language, genericErrorMessage: labels.genericError });

  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  if (!user) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || isSending) return;
    sendMessage(draft);
    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!draft.trim() || isSending) return;
      sendMessage(draft);
      setDraft('');
    }
  }

  function handleFindProviders(categoryId: number | null) {
    navigate(categoryId != null ? `/customer/search?categoryId=${categoryId}` : '/customer/search');
  }

  return (
    <div className="flex h-full min-h-[32rem] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-heading-2">{labels.title}</h1>
            <p className="text-body-sm text-muted-foreground">{labels.description}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={clear}
          disabled={messages.length === 0}
          className="gap-1.5"
        >
          <RotateCcw className="h-4 w-4" />
          {labels.clear}
        </Button>
      </div>

      <ModeSelector
        mode={mode}
        onChange={setMode}
        disabled={isSending}
        labels={{ AUTO: labels.modeAuto, SUPPORT: labels.modeSupport, DIAGNOSIS: labels.modeDiagnosis }}
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            {messages.length === 0 && (
              <ChatBubble
                message={{ id: 'welcome', role: 'assistant', content: labels.welcome }}
                role={user.role}
                labels={labels}
                onFindProviders={handleFindProviders}
              />
            )}

            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                role={user.role}
                labels={labels}
                onFindProviders={handleFindProviders}
              />
            ))}

            {isSending && <TypingIndicator label={labels.thinking} />}
            <div ref={bottomRef} />
          </div>
        </div>

        {isError && (
          <div className="border-t border-border p-4">
            <Alert variant="destructive" title={errorMessage ?? labels.genericError}>
              {canRetry && (
                <button
                  type="button"
                  onClick={retry}
                  className="mt-1 font-medium text-foreground underline underline-offset-2"
                >
                  {labels.retry}
                </button>
              )}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border p-3">
          <Textarea
            label={labels.inputLabel}
            hideLabel
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={labels.placeholder}
            rows={1}
            disabled={isSending}
            className="max-h-40 min-h-[2.5rem] flex-1 resize-none"
          />
          <Button
            type="submit"
            disabled={isSending || !draft.trim()}
            isLoading={isSending}
            aria-label={labels.send}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
