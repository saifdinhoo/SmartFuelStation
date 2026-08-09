import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? props.name ?? generatedId;
    return (
      <label htmlFor={inputId} className="inline-flex items-center gap-2 text-sm text-foreground">
        <input
          id={inputId}
          ref={ref}
          type="checkbox"
          className={cn('h-4 w-4 rounded border-border accent-primary', className)}
          {...props}
        />
        {label}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
