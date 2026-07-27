import type { ComponentType, ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <p className="text-heading-3">{title}</p>
      {description && <p className="text-body-sm max-w-sm text-muted-foreground">{description}</p>}
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
      {children}
    </div>
  );
}
