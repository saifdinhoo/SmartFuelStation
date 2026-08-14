import { Button } from '@/components/ui/Button';

interface DemoControlsProps {
  onSimulateLoading: () => void;
  onSimulateEmpty: () => void;
  onSimulateError: () => void;
}

// Dev-only controls to demonstrate the loading/empty/error states on
// demand, since this whole page runs on mock data.
export function DemoControls({
  onSimulateLoading,
  onSimulateEmpty,
  onSimulateError,
}: DemoControlsProps) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <p className="text-body-sm mb-3 text-muted-foreground">
        Demo controls — not part of the real dashboard, just for showing each state.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onSimulateLoading}>
          Reload (loading)
        </Button>
        <Button variant="ghost" onClick={onSimulateEmpty}>
          Simulate empty
        </Button>
        <Button variant="ghost" onClick={onSimulateError}>
          Simulate error
        </Button>
      </div>
    </div>
  );
}
