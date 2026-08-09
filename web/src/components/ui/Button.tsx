import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  ghost: 'bg-transparent text-foreground border border-border hover:bg-muted',
};

// Framer Motion redefines onAnimationStart/onDrag* with its own signatures,
// which conflict with React's native DOM event types — omit them since
// nothing here needs to pass those handlers through.
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd'
>;

interface ButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  isLoading,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  );
}
