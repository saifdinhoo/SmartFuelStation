import type { ReactNode } from 'react';

interface FormFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

// Generic label + hint + validation-message wrapper for controls that don't
// already have that built in (Checkbox, Switch, custom inputs). Input,
// Textarea, PasswordInput, and SearchInput already embed this pattern
// directly, so they don't need to be wrapped in this.
export function FormField({ label, hint, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-muted-foreground">{label}</span>}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
