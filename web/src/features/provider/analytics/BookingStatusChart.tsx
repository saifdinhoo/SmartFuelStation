import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import type { BookingStatus, BookingStatusSlice } from './types';

const STATUS_COLOR: Record<BookingStatus, string> = {
  Completed: 'var(--success)',
  Cancelled: 'var(--destructive)',
  'No-show': 'var(--warning)',
  Pending: 'var(--muted-foreground)',
};

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
                    <Cell key={slice.status} fill={STATUS_COLOR[slice.status]} />
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
                    style={{ backgroundColor: STATUS_COLOR[slice.status] }}
                  />
                  {slice.status}
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
