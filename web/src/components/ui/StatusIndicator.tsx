type StatusVariant = 'success' | 'warning' | 'destructive' | 'neutral';

const dotClasses: Record<StatusVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  neutral: 'bg-muted-foreground',
};

interface StatusIndicatorProps {
  variant: StatusVariant;
  label: string;
}

export function StatusIndicator({ variant, label }: StatusIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-foreground">
      <span className={`h-2 w-2 rounded-full ${dotClasses[variant]}`} aria-hidden="true" />
      {label}
    </span>
  );
}
