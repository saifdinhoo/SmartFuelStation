import { StatusIndicator } from './StatusIndicator';

export type ProviderStatus = 'open' | 'busy' | 'closed' | 'unavailable';

const config: Record<
  ProviderStatus,
  { variant: 'success' | 'warning' | 'neutral' | 'destructive'; label: string }
> = {
  open: { variant: 'success', label: 'Open' },
  busy: { variant: 'warning', label: 'Busy' },
  closed: { variant: 'neutral', label: 'Closed' },
  unavailable: { variant: 'destructive', label: 'Unavailable' },
};

// Domain-specific status for a service provider/shop, built on the
// generic StatusIndicator primitive.
export function ProviderStatusIndicator({ status }: { status: ProviderStatus }) {
  const { variant, label } = config[status];
  return <StatusIndicator variant={variant} label={label} />;
}
