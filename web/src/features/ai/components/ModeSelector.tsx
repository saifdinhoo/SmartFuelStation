import { Sparkles, Wrench, Stethoscope, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AiMode } from '../types';

interface ModeSelectorProps {
  mode: AiMode;
  onChange: (mode: AiMode) => void;
  labels: Record<AiMode, string>;
  disabled?: boolean;
}

const ORDER: AiMode[] = ['AUTO', 'SUPPORT', 'DIAGNOSIS'];

const ICONS: Record<AiMode, LucideIcon> = {
  AUTO: Sparkles,
  SUPPORT: Wrench,
  DIAGNOSIS: Stethoscope,
};

// A small segmented control — the request always carries the real enum
// value (AUTO/SUPPORT/DIAGNOSIS); only these labels are human-friendly.
export function ModeSelector({ mode, onChange, labels, disabled }: ModeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Assistant mode"
      className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1"
    >
      {ORDER.map((value) => {
        const Icon = ICONS[value];
        const active = value === mode;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(value)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              active
                ? 'bg-card text-foreground shadow-[var(--shadow-sm)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {labels[value]}
          </button>
        );
      })}
    </div>
  );
}
