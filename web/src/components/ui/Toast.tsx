import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'destructive';

const variantConfig: Record<ToastVariant, { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: 'border-border bg-card' },
  success: { icon: CheckCircle2, classes: 'border-success/30 bg-success/10' },
  warning: { icon: AlertTriangle, classes: 'border-warning/40 bg-warning/10' },
  destructive: { icon: XCircle, classes: 'border-destructive/30 bg-destructive/10' },
};

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
}

export function Toast({ id, title, description, variant = 'info', onDismiss }: ToastProps) {
  const { icon: Icon, classes } = variantConfig[variant];

  return (
    <div
      role="status"
      className={`flex w-80 gap-3 rounded-lg border p-4 text-foreground shadow-[var(--shadow-md)] ${classes}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
