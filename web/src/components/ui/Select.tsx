import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  hideLabel?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, hideLabel, id, className, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? props.name ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={selectId}
          className={cn('text-sm font-medium text-muted-foreground', hideLabel && 'sr-only')}
        >
          {label}
        </label>
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'rounded-md border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors',
            error
              ? 'border-destructive focus:border-destructive'
              : 'border-border focus:border-primary',
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
