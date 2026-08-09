import type { HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

type AlertVariant = 'info' | 'success' | 'warning' | 'destructive';

const variantConfig: Record<AlertVariant, { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: 'border-border bg-muted text-foreground' },
  success: { icon: CheckCircle2, classes: 'border-success/30 bg-success/10 text-foreground' },
  warning: { icon: AlertTriangle, classes: 'border-warning/40 bg-warning/10 text-foreground' },
  destructive: {
    icon: XCircle,
    classes: 'border-destructive/30 bg-destructive/10 text-foreground',
  },
};

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title: string;
  children?: ReactNode;
}

export function Alert({ variant = 'info', title, children, className, ...props }: AlertProps) {
  const { icon: Icon, classes } = variantConfig[variant];
  return (
    <div
      className={cn('flex gap-3 rounded-lg border p-4', classes, className)}
      role="alert"
      {...props}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{title}</p>
        {children && <p className="text-sm text-muted-foreground">{children}</p>}
      </div>
    </div>
  );
}
