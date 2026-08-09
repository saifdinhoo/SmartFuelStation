import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merges class strings AND resolves Tailwind conflicts by dropping the
// earlier utility instead of relying on CSS source order (which caused a
// real bug: Button's base "px-4 py-2" silently beat a caller's "p-0"
// override because of generated-stylesheet order, not JSX class order).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
