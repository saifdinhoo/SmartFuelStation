import { DAYS_OF_WEEK, DAY_LABELS, type OperatingHourEntry } from './types';

interface OperatingHoursListProps {
  hours: OperatingHourEntry[];
}

// Read-only weekly schedule, shown to customers on Provider Details.
// Deliberately separate from the provider's live isOpen indicator — these
// are the hours the provider has scheduled, not whether they happen to be
// open at this exact moment (a provider can be within scheduled hours but
// have manually marked themselves closed, or vice versa).
export function OperatingHoursList({ hours }: OperatingHoursListProps) {
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));

  if (hours.length === 0) {
    return (
      <p className="text-body-sm text-muted-foreground">
        This provider hasn&apos;t set their operating hours yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {DAYS_OF_WEEK.map((day) => {
        const entry = byDay.get(day);
        return (
          <li key={day} className="flex items-center justify-between">
            <span className="text-foreground">{DAY_LABELS[day]}</span>
            <span className="text-muted-foreground">
              {!entry
                ? 'Hours not set'
                : entry.isClosed
                  ? 'Closed'
                  : `${entry.openTime} – ${entry.closeTime}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
