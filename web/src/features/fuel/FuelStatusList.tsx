import type { FuelInventoryItem } from './types';

function formatLiters(value: number): string {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })} L`;
}

function barColor(pct: number): string {
  if (pct <= 15) return 'bg-destructive';
  if (pct <= 35) return 'bg-warning';
  return 'bg-success';
}

interface FuelStatusListProps {
  items: FuelInventoryItem[];
  /** Hides the price row — the provider's own read-only view doesn't need it repeated. */
  showPrice?: boolean;
}

// Shared by the customer Provider Details page and the provider's own
// read-only "My Fuel Inventory" section — same real data, same rendering,
// so the two can never drift into showing different numbers for the same
// row.
export function FuelStatusList({ items, showPrice = true }: FuelStatusListProps) {
  if (items.length === 0) return null;

  const lastUpdated = items.reduce(
    (latest, item) => (item.updatedAt > latest ? item.updatedAt : latest),
    items[0].updatedAt,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.fuelType} className="rounded-md border border-border p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-medium text-foreground">{item.displayName}</p>
              <p className="text-body-sm text-muted-foreground">
                {item.percentageRemaining}%
              </p>
            </div>
            <p className="text-caption mt-0.5">
              Remaining: {formatLiters(item.currentLiters)} · Capacity:{' '}
              {formatLiters(item.capacityLiters)}
              {showPrice && item.pricePerLiter !== null ? ` · $${item.pricePerLiter}/L` : ''}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-[width] ${barColor(item.percentageRemaining)}`}
                style={{ width: `${item.percentageRemaining}%` }}
                role="progressbar"
                aria-valuenow={item.percentageRemaining}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.displayName} remaining`}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-caption">
        Last updated:{' '}
        {new Date(lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </p>
    </div>
  );
}
