import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  /** Keeps the label for screen readers/htmlFor association but hides it
   *  visually — for compact contexts like a topbar search field. */
  hideLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, startAdornment, endAdornment, hideLabel, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? props.name ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className={cn('text-sm font-medium text-muted-foreground', hideLabel && 'sr-only')}
        >
          {label}
        </label>
        <div className="relative">
          {startAdornment && (
            <div className="absolute inset-y-0 start-0 flex items-center ps-2.5 text-muted-foreground">
              {startAdornment}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground',
              startAdornment && 'ps-9',
              endAdornment && 'pe-9',
              error
                ? 'border-destructive focus:border-destructive'
                : 'border-border focus:border-primary',
              className,
            )}
            {...props}
          />
          {endAdornment && (
            <div className="absolute inset-y-0 end-0 flex items-center pe-2.5">{endAdornment}</div>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
