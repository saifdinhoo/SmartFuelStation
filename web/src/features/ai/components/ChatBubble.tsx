import { cn } from '@/utils/cn';
import type { AuthUser } from '@/features/auth/authApi';
import type { AiLabels } from '../labels';
import type { ChatMessage } from '../types';
import { DiagnosisPanel } from './DiagnosisPanel';

interface ChatBubbleProps {
  message: ChatMessage;
  role?: AuthUser['role'];
  labels: AiLabels;
  onFindProviders: (categoryId: number | null) => void;
}

// justify-end/justify-start use CSS logical start/end, so this already
// flips correctly under RTL without any direction-specific code here.
export function ChatBubble({ message, role, labels, onFindProviders }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className="flex max-w-[85%] flex-col gap-3 sm:max-w-[75%]">
        <div
          className={cn(
            'whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-body-sm',
            isUser
              ? 'rounded-ee-sm bg-primary text-primary-foreground'
              : 'rounded-ss-sm bg-muted text-foreground',
          )}
        >
          {message.content}
        </div>

        {!isUser && message.mode === 'DIAGNOSIS' && message.diagnosis && (
          <DiagnosisPanel
            diagnosis={message.diagnosis}
            suggestedAction={message.suggestedAction ?? null}
            suggestedCategoryId={message.suggestedCategoryId ?? null}
            role={role}
            labels={labels}
            onFindProviders={onFindProviders}
          />
        )}
      </div>
    </div>
  );
}
