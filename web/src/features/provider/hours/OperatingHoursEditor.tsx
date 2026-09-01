import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useOwnHours, useUpdateOwnHours } from '@/features/scheduling/useOperatingHours';
import { DAYS_OF_WEEK, DAY_LABELS, type DayOfWeek, type OperatingHourEntry } from '@/features/scheduling/types';

interface RowState {
  dayOfWeek: DayOfWeek;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
}

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '18:00';

// Every weekday is always shown, even ones the provider has never
// configured — a missing row means "closed" here, since that is the
// customer-facing meaning of HOURS_NOT_CONFIGURED for a day (see
// availability.service.js). This never *saves* anything for an
// untouched day unless the provider hits Save, which sends the whole
// week.
function toRows(hours: OperatingHourEntry[] | undefined): RowState[] {
  const byDay = new Map(hours?.map((h) => [h.dayOfWeek, h]));
  return DAYS_OF_WEEK.map((day) => {
    const existing = byDay.get(day);
    return {
      dayOfWeek: day,
      isClosed: existing?.isClosed ?? true,
      openTime: existing?.openTime ?? DEFAULT_OPEN,
      closeTime: existing?.closeTime ?? DEFAULT_CLOSE,
    };
  });
}

function rowError(row: RowState): string | null {
  if (row.isClosed) return null;
  if (!row.openTime || !row.closeTime) return 'Set both an opening and closing time';
  if (row.closeTime <= row.openTime) return 'Closing time must be after opening time';
  return null;
}

export function OperatingHoursEditor() {
  const { hours, isPending, isError, errorMessage, reload } = useOwnHours();
  const { save, isSaving } = useUpdateOwnHours();
  const [rows, setRows] = useState<RowState[]>(() => toRows(hours));
  const [dirty, setDirty] = useState(false);

  // Re-seed the draft whenever a fresh `hours` array arrives from the
  // server (first load, or right after a successful save) — computed
  // during render rather than in an effect, so the reset and the render
  // it belongs to happen in the same commit instead of a follow-up one.
  const [seededFrom, setSeededFrom] = useState(hours);
  if (hours !== seededFrom) {
    setSeededFrom(hours);
    setRows(toRows(hours));
    setDirty(false);
  }

  function updateRow(day: DayOfWeek, patch: Partial<RowState>) {
    setRows((current) => current.map((r) => (r.dayOfWeek === day ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  const errors = rows.map(rowError);
  const hasErrors = errors.some(Boolean);

  async function onSave() {
    const entries: OperatingHourEntry[] = rows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      isClosed: r.isClosed,
      openTime: r.isClosed ? null : r.openTime,
      closeTime: r.isClosed ? null : r.closeTime,
    }));
    await save(entries);
    setDirty(false);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-heading-3">Operating hours</h2>
        <p className="text-body-sm text-muted-foreground">
          Shown to customers, and used to decide which times they can book.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isError && (
          <ErrorState
            title="Could not load your operating hours"
            description={errorMessage ?? undefined}
            onRetry={reload}
          />
        )}

        {!isError && isPending && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))}
          </div>
        )}

        {!isError && !isPending && (
          <>
            <div className="flex flex-col gap-3">
              {rows.map((row, i) => (
                <div
                  key={row.dayOfWeek}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3"
                >
                  <div className="w-28 shrink-0 text-sm font-medium text-foreground">
                    {DAY_LABELS[row.dayOfWeek]}
                  </div>
                  <Switch
                    checked={!row.isClosed}
                    onChange={(open) => updateRow(row.dayOfWeek, { isClosed: !open })}
                    label={`${DAY_LABELS[row.dayOfWeek]} open`}
                  />
                  {row.isClosed ? (
                    <span className="text-body-sm text-muted-foreground">Closed</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        aria-label={`${DAY_LABELS[row.dayOfWeek]} opening time`}
                        value={row.openTime}
                        onChange={(e) => updateRow(row.dayOfWeek, { openTime: e.target.value })}
                        className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                      />
                      <span className="text-muted-foreground">to</span>
                      <input
                        type="time"
                        aria-label={`${DAY_LABELS[row.dayOfWeek]} closing time`}
                        value={row.closeTime}
                        onChange={(e) => updateRow(row.dayOfWeek, { closeTime: e.target.value })}
                        className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  )}
                  {errors[i] && <p className="w-full text-xs text-destructive">{errors[i]}</p>}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={!dirty || isSaving}
                onClick={() => {
                  setRows(toRows(hours));
                  setDirty(false);
                }}
              >
                Discard changes
              </Button>
              <Button
                type="button"
                onClick={onSave}
                isLoading={isSaving}
                disabled={!dirty || hasErrors}
              >
                Save changes
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
