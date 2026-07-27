import type { HTMLAttributes } from 'react';

// Loading placeholder. Uses Tailwind's animate-pulse, which the global
// prefers-reduced-motion rule in styles/index.css automatically disables.
export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} {...props} />;
}
