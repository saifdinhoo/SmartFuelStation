import { motion, useReducedMotion } from 'framer-motion';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <span className="inline-flex items-center gap-2 text-sm text-foreground">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <motion.span
          layout
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
          className="h-4.5 w-4.5 rounded-full bg-white shadow-sm"
          style={{ marginInlineStart: checked ? 'calc(100% - 1.125rem - 2px)' : '2px' }}
        />
      </button>
      {label}
    </span>
  );
}
