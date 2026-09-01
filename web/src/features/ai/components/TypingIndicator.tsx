// Subtle, non-alarming loading cue for while a request is in flight.
// animate-bounce is disabled globally under prefers-reduced-motion (see
// src/styles/index.css), so this respects that automatically.
export function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 self-start rounded-2xl rounded-ss-sm bg-muted px-4 py-2.5 text-body-sm text-muted-foreground">
      <span className="flex gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </span>
      {label}
    </div>
  );
}
