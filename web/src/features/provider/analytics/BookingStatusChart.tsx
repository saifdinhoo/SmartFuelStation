import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import type { BookingStatusSlice } from './types';

// Keyed by the real BookingStatus enum values the API returns. Anything
// unrecognized falls back to a neutral colour rather than rendering
// `undefined` as a fill.
const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'var(--success)',
  IN_SERVICE: 'var(--primary)',
  IN_QUEUE: 'var(--primary)',
  ARRIVED: 'var(--primary)',
  CONFIRMED: 'var(--primary)',
  PENDING: 'var(--warning)',
  CANCELLED: 'var(--destructive)',
  REJECTED: 'var(--destructive)',
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Completed',
  IN_SERVICE: 'In service',
  IN_QUEUE: 'In queue',
  ARRIVED: 'Arrived',
  CONFIRMED: 'Confirmed',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

const colorFor = (status: string) => STATUS_COLOR[status] ?? 'var(--muted-foreground)';
const labelFor = (status: string) => STATUS_LABEL[status] ?? status;

export function BookingStatusChart({ data }: { data: BookingStatusSlice[] }) {
  const total = data.reduce((sum, slice) => sum + slice.count, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <PieChartIcon className="h-4 w-4 text-primary" />
        <h2 className="text-heading-3">Booking Status Breakdown</h2>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-56 w-full sm:w-1/2" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="status"
                  innerRadius="60%"
                  outerRadius="90%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((slice) => (
                    <Cell key={slice.status} fill={colorFor(slice.status)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  formatter={(value, name) => {
                    const count = Number(value);
                    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                    return [`${count} (${percent}%)`, name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex w-full flex-col gap-2 sm:w-1/2">
            {data.map((slice) => (
              <li key={slice.status} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorFor(slice.status) }}
                  />
                  {labelFor(slice.status)}
                </span>
                <span className="font-medium text-foreground">
                  {slice.count}
                  <span className="ml-1 text-muted-foreground">
                    ({total > 0 ? Math.round((slice.count / total) * 100) : 0}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
