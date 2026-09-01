import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useProviderFuelHistory } from './useFuel';
import type { FuelHistoryRange, FuelType } from './types';
import { FUEL_TYPE_LABELS } from './types';

const RANGE_OPTIONS: { value: FuelHistoryRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

interface FuelHistoryChartProps {
  providerId: number;
  fuelTypes: FuelType[];
}

function formatTick(timestamp: string) {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Real recorded points only — one per Admin update, including the initial
// creation. Never an invented trend: a single point renders as a single
// point plus an honest "more history will appear" message rather than a
// fabricated line.
export function FuelHistoryChart({ providerId, fuelTypes }: FuelHistoryChartProps) {
  const [fuelType, setFuelType] = useState<FuelType>(fuelTypes[0]);
  const [range, setRange] = useState<FuelHistoryRange>('7d');
  const { history, isPending, isError } = useProviderFuelHistory(providerId, fuelType, range);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-4 w-4 text-primary" />
          <h2 className="text-heading-3">Fuel Remaining Over Time</h2>
        </div>
        <div className="flex gap-2">
          {fuelTypes.length > 1 && (
            <Select
              label="Fuel type"
              hideLabel
              className="w-40"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
              options={fuelTypes.map((t) => ({ value: t, label: FUEL_TYPE_LABELS[t] }))}
            />
          )}
          <Select
            label="Range"
            hideLabel
            className="w-36"
            value={range}
            onChange={(e) => setRange(e.target.value as FuelHistoryRange)}
            options={RANGE_OPTIONS}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isError && (
          <p className="text-body-sm text-muted-foreground">Could not load fuel history.</p>
        )}

        {!isError && isPending && <Skeleton className="h-64 w-full rounded-md" />}

        {!isError && !isPending && history && history.length === 0 && (
          <p className="text-body-sm text-muted-foreground">
            No fuel history recorded in this range yet.
          </p>
        )}

        {!isError && !isPending && history && history.length > 0 && (
          <>
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={history.map((p) => ({ ...p, label: formatTick(p.timestamp) }))}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--border)' }}
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                    labelStyle={{ color: 'var(--foreground)' }}
                    formatter={(value) => [`${Number(value).toLocaleString()} L`, 'Remaining']}
                  />
                  <Line
                    type="linear"
                    dataKey="liters"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {history.length === 1 && (
              <p className="text-caption mt-2">
                More history will appear as fuel levels are updated.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
